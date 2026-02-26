import { NextResponse } from 'next/server';
import { checkRateLimit, requireAllowedOrigin, requireJsonContentType, serverError } from '@/app/api/_lib/requestSecurity';
import { getStripeClient, stripeConfigErrorResponse } from '@/app/api/_lib/stripeServer';

export async function POST(req: Request) {
  try {
    const stripe = getStripeClient();
    if (!stripe) return stripeConfigErrorResponse();

    const originCheck = requireAllowedOrigin(req);
    if (originCheck) return originCheck;

    const limited = checkRateLimit(req, 'stripe-merch', 12, 60_000);
    if (limited) return limited;

    const contentCheck = requireJsonContentType(req);
    if (contentCheck) return contentCheck;

    const origin = req.headers.get('origin') as string;

    let body: { tier?: string } = {};
    try { body = await req.json(); } catch { /* default to hat */ }
    const tier = body.tier || 'hat';

    const tierConfig: Record<string, { name: string; description: string; amount: number; needsShipping: boolean }> = {
      coffee: { name: 'Buy the Founder a Coffee', description: 'Support Pull Up Coffee development — one flat white at a time.', amount: 450, needsShipping: false },
      supporter: { name: 'Big Supporter — Pull Up Coffee', description: 'Fuel a week of late-night coding and feature drops for Pull Up Coffee.', amount: 1000, needsShipping: false },
      hat: { name: 'Founders Cap — Pull Up Coffee', description: 'Limited edition dad hat. 100% cotton twill, unstructured low-profile crown, adjustable buckle strap. Made to order with premium embroidery.', amount: 4500, needsShipping: true },
    };

    const config = tierConfig[tier] || tierConfig.hat;

    const sessionParams: any = {
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'aud',
            product_data: { name: config.name, description: config.description },
            unit_amount: config.amount,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      metadata: { tier, fulfillment: config.needsShipping ? 'printful' : 'none' },
      success_url: `${origin}?merch_success=true`,
      cancel_url: `${origin}`,
    };

    if (config.needsShipping) {
      sessionParams.shipping_address_collection = { allowed_countries: ['AU'] };
      sessionParams.shipping_options = [
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
      ];
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    return NextResponse.json({ url: session.url });
  } catch (error: unknown) {
    console.error('Stripe merch checkout error:', error);
    return serverError('Unable to create merch checkout session');
  }
}
