import { NextResponse } from 'next/server';
import { checkRateLimit, isValidCafeId, parseJson, requireAllowedOrigin, requireJsonContentType, serverError } from '@/app/api/_lib/requestSecurity';
import { getStripeClient, stripeConfigErrorResponse } from '@/app/api/_lib/stripeServer';
import { getAdminDb } from '@/app/api/_lib/firebaseAdmin';
import { detectBot, checkIdempotency } from '@/app/api/_lib/botDefense';

type CheckoutCartItem = {
  name: string;
  size: string;
  milk: string;
  price: number;
};

/* ─── SERVER-SIDE PRICE CEILING ────────────────────────────────────── *
 * We verify every cart item price against:
 *   1. The cafe's Firestore menu (if available)        — exact match
 *   2. A hard global ceiling (MAX_ITEM_PRICE_AUD)      — catches garbage
 *
 * If the cafe has no Firestore menu yet (early launch), we allow the
 * item only if its price is within [0.50 .. ceiling]. This prevents
 * $0.01 attacks while still working before the catalog is fully loaded.
 * ──────────────────────────────────────────────────────────────────── */
const MAX_ITEM_PRICE_AUD = 100; // no single coffee item > $100 AUD
const MIN_ITEM_PRICE_AUD = 0.5; // nothing under 50 cents

/** Fetch server-side menu prices for a cafe (cached per request, not per instance) */
const getMenuPrices = async (cafeId: string): Promise<Map<string, number> | null> => {
  try {
    const db = getAdminDb();
    const menuSnap = await db.collection('cafes').doc(cafeId).collection('menu').get();
    if (menuSnap.empty) return null; // cafe has no menu in Firestore yet
    const prices = new Map<string, number>();
    for (const doc of menuSnap.docs) {
      const data = doc.data();
      if (typeof data.name === 'string' && typeof data.price === 'number') {
        prices.set(data.name.toLowerCase().trim(), data.price);
      }
    }
    return prices.size > 0 ? prices : null;
  } catch {
    return null; // DB failure — fall back to ceiling-only validation
  }
};

export async function POST(req: Request) {
  try {
    const stripe = getStripeClient();
    if (!stripe) return stripeConfigErrorResponse();

    const originCheck = requireAllowedOrigin(req);
    if (originCheck) return originCheck;

    // Bot / AI agent detection
    const botCheck = detectBot(req);
    if (botCheck) return botCheck;

    const contentTypeCheck = requireJsonContentType(req);
    if (contentTypeCheck) return contentTypeCheck;

    const limited = checkRateLimit(req, 'stripe-checkout', 15, 60_000);
    if (limited) return limited;

    const body = await parseJson<{ cart: CheckoutCartItem[]; orderId: string; cafeId?: string; fee?: number }>(req);
    if (!body) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { cart, orderId, cafeId, fee } = body;
    const origin = req.headers.get('origin') as string;

    if (!Array.isArray(cart) || cart.length === 0 || cart.length > 50) {
      return NextResponse.json({ error: 'Invalid cart' }, { status: 400 });
    }

    if (typeof orderId !== 'string' || orderId.length < 4 || orderId.length > 128) {
      return NextResponse.json({ error: 'Invalid orderId' }, { status: 400 });
    }

    // Idempotency guard — prevent duplicate checkout sessions
    const idempotencyCheck = checkIdempotency(`checkout:${orderId}`);
    if (idempotencyCheck) return idempotencyCheck;

    // Validate cafeId format (prevent Firestore path traversal)
    if (cafeId !== undefined && !isValidCafeId(cafeId)) {
      return NextResponse.json({ error: 'Invalid cafeId' }, { status: 400 });
    }

    if (typeof fee !== 'undefined' && (typeof fee !== 'number' || Number.isNaN(fee) || fee < 0 || fee > 20)) {
      return NextResponse.json({ error: 'Invalid fee' }, { status: 400 });
    }

    // ── SERVER-SIDE PRICE VALIDATION ─────────────────────────────────
    // Fetch cafe menu prices from Firestore to validate client-sent prices
    const serverPrices = cafeId ? await getMenuPrices(cafeId) : null;

    for (const item of cart) {
      if (typeof item.name !== 'string' || item.name.length < 1 || item.name.length > 200) {
        return NextResponse.json({ error: 'Invalid item name' }, { status: 400 });
      }
      if (typeof item.size !== 'string' || item.size.length > 50) {
        return NextResponse.json({ error: 'Invalid item size' }, { status: 400 });
      }
      if (typeof item.milk !== 'string' || item.milk.length > 50) {
        return NextResponse.json({ error: 'Invalid item milk' }, { status: 400 });
      }
      if (typeof item.price !== 'number' || Number.isNaN(item.price)) {
        return NextResponse.json({ error: 'Invalid item price' }, { status: 400 });
      }

      // Hard floor & ceiling regardless of menu
      if (item.price < MIN_ITEM_PRICE_AUD || item.price > MAX_ITEM_PRICE_AUD) {
        return NextResponse.json({ error: 'Item price out of allowed range' }, { status: 400 });
      }

      // If we have the cafe's menu, verify price hasn't been tampered with.
      // Allow a ±$2 tolerance window because size/milk upcharges are added client-side.
      if (serverPrices) {
        const basePrice = serverPrices.get(item.name.toLowerCase().trim());
        if (basePrice !== undefined) {
          const maxAllowed = basePrice + 2.0; // size + milk upcharges
          if (item.price > maxAllowed) {
            return NextResponse.json({ error: 'Item price exceeds catalog price' }, { status: 400 });
          }
          if (item.price < basePrice - 0.01) {
            return NextResponse.json({ error: 'Item price below catalog price' }, { status: 400 });
          }
        }
        // Item not in menu catalog — still protected by ceiling
      }
    }

    const lineItems = (cart as CheckoutCartItem[]).map((item) => ({
      price_data: {
        currency: 'aud',
        product_data: { name: `${item.name} (${item.size}, ${item.milk})`.slice(0, 250) },
        unit_amount: Math.round(item.price * 100), 
      },
      quantity: 1,
    }));

    // Dynamic Pull Up Curbside Fee
    const curbsideFeeAmount = Math.round((fee || 2) * 100);
    lineItems.push({
      price_data: {
        currency: 'aud',
        product_data: { name: 'Pull Up Curbside Fee' },
        unit_amount: curbsideFeeAmount, 
      },
      quantity: 1,
    });

    // Dynamic Pass-Through: calculate Stripe processing fee and add as line item
    const subtotalCents = lineItems.reduce((sum, item) => sum + item.price_data.unit_amount * item.quantity, 0);
    const totalWithProcessing = Math.ceil((subtotalCents + 30) / (1 - 0.0175));
    const processingFeeCents = totalWithProcessing - subtotalCents;

    if (processingFeeCents > 0) {
      lineItems.push({
        price_data: {
          currency: 'aud',
          product_data: { name: 'Payment Processing (Stripe)' },
          unit_amount: processingFeeCents,
        },
        quantity: 1,
      });
    }

    const safeCafeId = cafeId || '';

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      payment_intent_data: {
        capture_method: 'manual',
        metadata: { orderId, cafeId: safeCafeId },
      },
      success_url: `${origin}?success=true&order_id=${encodeURIComponent(orderId)}&cafe_id=${encodeURIComponent(safeCafeId)}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error: unknown) {
    console.error('Stripe checkout error:', error);
    return serverError('Unable to create checkout session');
  }
}
