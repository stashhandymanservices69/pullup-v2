import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { checkRateLimit, requireAllowedOrigin, requireJsonContentType, serverError } from '@/app/api/_lib/requestSecurity';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);

export async function POST(req: Request) {
  try {
    const originCheck = requireAllowedOrigin(req);
    if (originCheck) return originCheck;

    const contentTypeCheck = requireJsonContentType(req);
    if (contentTypeCheck) return contentTypeCheck;

    const limited = checkRateLimit(req, 'stripe-merch', 12, 60_000);
    if (limited) return limited;

    const origin = req.headers.get('origin') as string;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      shipping_address_collection: {
        allowed_countries: ['AU'],
      },
      shipping_options: [
        {
          shipping_rate_data: {
            type: 'fixed_amount',
            fixed_amount: { amount: 1000, currency: 'aud' },
            display_name: 'Standard Aussie Delivery',
            delivery_estimate: {
              minimum: { unit: 'business_day', value: 3 },
              maximum: { unit: 'business_day', value: 7 },
            },
          },
        },
      ],
      line_items: [
        {
          price_data: {
            currency: 'aud',
            product_data: {
              name: 'Classic Dad Hat | Yupoong 6245CM',
              description: '100% cotton twill, unstructured low-profile crown, adjustable buckle strap, pre-curved visor. Made to order with premium embroidery.',
            },
            unit_amount: 4500,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${origin}?merch_success=true`,
      cancel_url: `${origin}`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error: unknown) {
    console.error('Stripe merch checkout error:', error);
    return serverError('Unable to create merch checkout session');
  }
}
