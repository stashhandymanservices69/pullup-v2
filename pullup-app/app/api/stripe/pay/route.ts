import { NextResponse } from 'next/server';
import { checkRateLimit, isValidCafeId, parseJson, requireAllowedOrigin, requireJsonContentType, serverError } from '@/app/api/_lib/requestSecurity';
import { getStripeClient, stripeConfigErrorResponse } from '@/app/api/_lib/stripeServer';
import { getAdminDb } from '@/app/api/_lib/firebaseAdmin';
import { getCurrency } from '@/lib/i18n';

type PayItem = {
  name: string;
  price: number;
};

export async function POST(req: Request) {
  try {
    const stripe = getStripeClient();
    if (!stripe) return stripeConfigErrorResponse();

    const originCheck = requireAllowedOrigin(req);
    if (originCheck) return originCheck;

    const contentTypeCheck = requireJsonContentType(req);
    if (contentTypeCheck) return contentTypeCheck;

    const limited = checkRateLimit(req, 'stripe-pay', 15, 60_000);
    if (limited) return limited;

    const body = await parseJson<{ items: PayItem[]; cafeStripeId: string; cafeId?: string; customerName?: string }>(req);
    if (!body) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { items, cafeStripeId, cafeId, customerName } = body;

    if (!Array.isArray(items) || items.length === 0 || items.length > 50) {
      return NextResponse.json({ error: 'Invalid items' }, { status: 400 });
    }

    if (typeof cafeStripeId !== 'string' || !/^acct_[a-zA-Z0-9]+$/.test(cafeStripeId)) {
      return NextResponse.json({ error: 'Invalid cafeStripeId' }, { status: 400 });
    }

    // Validate cafeId format
    if (cafeId !== undefined && !isValidCafeId(cafeId)) {
      return NextResponse.json({ error: 'Invalid cafeId' }, { status: 400 });
    }

    // Validate each item
    for (const item of items) {
      if (typeof item.name !== 'string' || item.name.length < 1 || item.name.length > 200) {
        return NextResponse.json({ error: 'Invalid item name' }, { status: 400 });
      }
      if (typeof item.price !== 'number' || Number.isNaN(item.price) || item.price < 0.5 || item.price > 100) {
        return NextResponse.json({ error: 'Invalid item price' }, { status: 400 });
      }
    }

    const typedItems = items as PayItem[];

    // ── $0.99 Flat Service Fee Model (Model F) ──────────────────
    // Platform revenue = flat $0.99 per order (Pull Up Service Fee)
    // Cafe keeps 100% of menu prices + 100% of curbside fee
    // Stripe processing (~1.75% + 30¢) absorbed by cafe
    const PLATFORM_SERVICE_FEE_CENTS = 99; // $0.99 flat platform fee

    // Determine currency from cafe country
    let cafeCurrency = 'aud';
    if (cafeId) {
      try {
        const db = getAdminDb();
        const cafeDoc = await db.collection('cafes').doc(cafeId).get();
        cafeCurrency = getCurrency(cafeDoc.data()?.country || 'AU');
      } catch { /* fallback to aud */ }
    }

    const origin = req.headers.get('origin') as string;

    // Build line items — menu items + Pull Up Service Fee
    // Curbside fee is handled separately in the checkout route; this route
    // is used for Stripe Connect destination charges.
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        ...typedItems.map((item) => ({
          price_data: {
            currency: cafeCurrency,
            product_data: { name: item.name },
            unit_amount: Math.round(item.price * 100),
          },
          quantity: 1,
        })),
        {
          price_data: {
            currency: cafeCurrency,
            product_data: { name: 'Pull Up Service Fee' },
            unit_amount: PLATFORM_SERVICE_FEE_CENTS,
          },
          quantity: 1,
        }
      ],
      mode: 'payment',
      payment_intent_data: {
        application_fee_amount: PLATFORM_SERVICE_FEE_CENTS,
        transfer_data: { destination: cafeStripeId },
      },
      success_url: `${origin}/?view=success&orderId={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/`,
      metadata: {
        cafeId: typeof cafeId === 'string' ? cafeId.slice(0, 128) : '',
        customerName: typeof customerName === 'string' ? customerName.slice(0, 128) : '',
      }
    });

    return NextResponse.json({ url: session.url });
  } catch (error: unknown) {
    console.error("Payment Error:", error);
    return serverError('Unable to initialize payment');
  }
}
