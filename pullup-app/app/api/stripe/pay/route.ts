import { NextResponse } from 'next/server';
import { checkRateLimit, isValidCafeId, parseJson, requireAllowedOrigin, requireJsonContentType, serverError } from '@/app/api/_lib/requestSecurity';
import { getStripeClient, stripeConfigErrorResponse } from '@/app/api/_lib/stripeServer';

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
    const serviceFee = 2.00; // Your standard fee
    const platformCut = 0.40; // 20% of the $2.00 fee
    
    const feeAmountCents = Math.round(platformCut * 100);

    const origin = req.headers.get('origin') as string;

    // 2. Create the session with a Destination Charge
    // The customer pays, Stripe takes your cut, and sends the rest to the Cafe
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        ...typedItems.map((item) => ({
          price_data: {
            currency: 'aud',
            product_data: { name: item.name },
            unit_amount: Math.round(item.price * 100),
          },
          quantity: 1,
        })),
        {
          price_data: {
            currency: 'aud',
            product_data: { name: 'Curbside Service Fee' },
            unit_amount: Math.round(serviceFee * 100),
          },
          quantity: 1,
        }
      ],
      mode: 'payment',
      payment_intent_data: {
        application_fee_amount: feeAmountCents,
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
