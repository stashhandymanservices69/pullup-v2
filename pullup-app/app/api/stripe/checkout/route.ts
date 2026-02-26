import { NextResponse } from 'next/server';
import { checkRateLimit, parseJson, requireAllowedOrigin, requireJsonContentType, serverError } from '@/app/api/_lib/requestSecurity';
import { getStripeClient, stripeConfigErrorResponse } from '@/app/api/_lib/stripeServer';

type CheckoutCartItem = {
  name: string;
  size: string;
  milk: string;
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

    const limited = checkRateLimit(req, 'stripe-checkout', 20, 60_000);
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

    if (typeof fee !== 'undefined' && (typeof fee !== 'number' || Number.isNaN(fee) || fee < 0 || fee > 20)) {
      return NextResponse.json({ error: 'Invalid fee' }, { status: 400 });
    }

    const lineItems = (cart as CheckoutCartItem[]).map((item) => ({
      price_data: {
        currency: 'aud',
        product_data: { name: `${item.name} (${item.size}, ${item.milk})` },
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
    // Formula: TotalCharge = ceil((subtotal + fee + 30) / (1 - 0.0175))
    // This ensures the cafe receives their full menu price and the customer pays the processing cost
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

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      payment_intent_data: {
        capture_method: 'manual',
        metadata: { orderId, cafeId: typeof cafeId === 'string' ? cafeId.slice(0, 128) : '' },
      },
      success_url: `${origin}?success=true&order_id=${orderId}&cafe_id=${cafeId || ''}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error: unknown) {
    console.error('Stripe checkout error:', error);
    return serverError('Unable to create checkout session');
  }
}
