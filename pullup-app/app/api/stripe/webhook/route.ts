import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getStripeClient } from '@/app/api/_lib/stripeServer';
import { createPrintfulOrder } from '@/app/api/_lib/printfulApi';

/**
 * Stripe Webhook Handler
 *
 * Listens for checkout.session.completed events.
 * When a hat (Founders Cap) purchase completes, automatically
 * creates a Printful order using the customer's shipping address.
 *
 * Setup:
 *   1. In Stripe Dashboard → Developers → Webhooks → Add endpoint
 *   2. URL: https://pullupcoffee.com.au/api/stripe/webhook
 *   3. Events: checkout.session.completed
 *   4. Copy the webhook signing secret → STRIPE_WEBHOOK_SECRET env var
 */

export async function POST(req: Request) {
  const stripe = getStripeClient();
  if (!stripe) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!webhookSecret) {
    console.error('Webhook: STRIPE_WEBHOOK_SECRET not configured');
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 503 });
  }

  // Read raw body for signature verification
  const rawBody = await req.text();
  const signature = req.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  // Handle checkout.session.completed
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const metadata = session.metadata || {};

    // Only process hat/printful orders
    if (metadata.fulfillment === 'printful' && metadata.tier === 'hat') {
      console.log(`Webhook: Hat purchase detected — session ${session.id}`);

      try {
        // Retrieve session with collected information expanded
        const fullSession = await stripe.checkout.sessions.retrieve(session.id, {
          expand: ['collected_information'],
        });

        const shipping = fullSession.collected_information?.shipping_details;
        const customerDetails = fullSession.customer_details;

        if (!shipping?.address) {
          console.error(`Webhook: No shipping address for session ${session.id}`);
          // Payment succeeded but no address — log for manual fulfillment
          return NextResponse.json({ received: true, printful: 'no_address' });
        }

        const address = shipping.address;

        // Map Australian state names to codes if needed
        const stateCode = address.state || '';

        const result = await createPrintfulOrder(
          {
            name: shipping.name || customerDetails?.name || 'Pull Up Customer',
            address1: address.line1 || '',
            address2: address.line2 || undefined,
            city: address.city || '',
            state_code: stateCode,
            country_code: address.country || 'AU',
            zip: address.postal_code || '',
            email: customerDetails?.email || undefined,
            phone: customerDetails?.phone || undefined,
          },
          session.id, // Use Stripe session ID as external reference
        );

        if (result.success) {
          console.log(`Webhook: Printful order #${result.orderId} created for session ${session.id}`);
        } else {
          // Log error but don't fail the webhook — payment already collected
          // Steven can manually create the order in Printful dashboard
          console.error(`Webhook: Printful order failed for session ${session.id}: ${result.error}`);
        }

        return NextResponse.json({
          received: true,
          printful: result.success ? 'order_created' : 'order_failed',
          printfulOrderId: result.orderId,
        });
      } catch (err) {
        console.error(`Webhook: Error processing hat order for session ${session.id}:`, err);
        return NextResponse.json({ received: true, printful: 'error' });
      }
    }
  }

  // Acknowledge all other events
  return NextResponse.json({ received: true });
}
