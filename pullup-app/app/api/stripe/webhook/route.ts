import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getStripeClient } from '@/app/api/_lib/stripeServer';
import { createPrintfulOrder } from '@/app/api/_lib/printfulApi';
import { buildMerchOrderEmail, buildSupportThankYouEmail, buildOrderConfirmationEmail, sendEmail } from '@/app/api/_lib/resendEmail';
import { getAdminDb } from '@/app/api/_lib/firebaseAdmin';
import { trackAffiliateCommission } from '@/app/api/_lib/affiliateTracker';

/**
 * Stripe Webhook Handler
 *
 * Listens for checkout.session.completed events.
 * When a hat (Founders Cap) purchase completes, automatically
 * creates a Printful order using the customer's shipping address.
 *
 * Setup:
 *   1. In Stripe Dashboard → Developers → Webhooks → Add endpoint
 *   2. URL: https://pullupcoffee.com/api/stripe/webhook
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

    // ── Hat / Printful fulfillment ──────────────────────────────────
    if (metadata.fulfillment === 'printful' && metadata.tier === 'hat') {
      console.log(`Webhook: Hat purchase detected — session ${session.id}`);

      // Send merch confirmation email
      const customerEmail = session.customer_details?.email;
      if (customerEmail) {
        const merchTemplate = buildMerchOrderEmail({
          customerName: session.customer_details?.name || 'Pull Up Customer',
          customerEmail,
          itemName: 'Founders Cap — Pull Up Coffee',
          amount: (session.amount_total || 4500) / 100,
        });
        sendEmail(customerEmail, merchTemplate).then((r) => {
          if (!r.success) console.error(`[Webhook] Merch email failed:`, r.error);
          else console.log(`[Webhook] Merch confirmation email sent to ${customerEmail}`);
        }).catch(() => {});
      }

      try {
        // Retrieve session with collected information expanded
        const fullSession = await stripe.checkout.sessions.retrieve(session.id, {
          expand: ['collected_information'],
        });

        const shipping = fullSession.collected_information?.shipping_details;
        const customerDetails = fullSession.customer_details;

        if (!shipping?.address) {
          console.error(`Webhook: No shipping address for session ${session.id}`);
          return NextResponse.json({ received: true, printful: 'no_address' });
        }

        const address = shipping.address;
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
          session.id,
        );

        if (result.success) {
          console.log(`Webhook: Printful order #${result.orderId} created for session ${session.id}`);
        } else {
          console.error(`Webhook: Printful order failed for session ${session.id}: ${result.error}`);
        }

        return NextResponse.json({
          received: true,
          printful: result.success ? 'order_created' : 'order_failed',
        });
      } catch (err) {
        console.error(`Webhook: Error processing hat order for session ${session.id}:`, err);
        return NextResponse.json({ received: true, printful: 'error' });
      }
    }

    // ── Non-hat support tiers (coffee, supporter, VIP) ──────────────
    if (metadata.fulfillment === 'none' && metadata.tier) {
      const customerEmail = session.customer_details?.email;
      if (customerEmail) {
        const tierNames: Record<string, string> = {
          coffee: 'Buy the Founder a Coffee',
          supporter: 'Legend — Pull Up Coffee',
          vip: 'Big Supporter VIP — Pull Up Coffee',
        };
        const supportTemplate = buildSupportThankYouEmail({
          customerName: session.customer_details?.name || 'Pull Up Supporter',
          customerEmail,
          tierName: tierNames[metadata.tier] || 'Pull Up Coffee Support',
          amount: (session.amount_total || 0) / 100,
          tier: metadata.tier,
        });
        sendEmail(customerEmail, supportTemplate).then((r) => {
          if (!r.success) console.error(`[Webhook] Support email failed:`, r.error);
          else console.log(`[Webhook] Support thank-you sent to ${customerEmail}`);
        }).catch(() => {});
      }
    }

    // ── Track merch/donation purchases in Firestore (for P.U.L.S.E. dashboard) ──
    if (metadata.tier && (metadata.fulfillment === 'printful' || metadata.fulfillment === 'none')) {
      try {
        const db = getAdminDb();
        await db.collection('merch_purchases').add({
          tier: metadata.tier,
          amount: session.amount_total || 0,
          currency: session.currency || 'aud',
          customerName: session.customer_details?.name || 'Anonymous',
          customerEmail: session.customer_details?.email || '',
          stripeSessionId: session.id,
          createdAt: new Date().toISOString(),
        });
        console.log(`[Webhook] Merch purchase tracked: ${metadata.tier} — $${((session.amount_total || 0) / 100).toFixed(2)}`);
      } catch (merchErr) {
        console.error(`[Webhook] Failed to track merch purchase:`, merchErr);
      }
    }

    // ── Regular order checkout (curbside) ───────────────────────────
    if (metadata.orderId && metadata.cafeId) {
      const customerEmail = session.customer_details?.email;
      if (customerEmail) {
        try {
          const db = getAdminDb();
          const orderDoc = await db.collection('orders').doc(metadata.orderId).get();
          const orderData = orderDoc.exists ? orderDoc.data() : null;
          const cafeDoc = await db.collection('cafes').doc(metadata.cafeId).get();
          const cafeData = cafeDoc.exists ? cafeDoc.data() : null;

          if (orderData) {
            const items = (orderData.items || []).map((i: any) => ({
              name: String(i.name || 'Item'),
              size: String(i.size || 'Regular'),
              milk: String(i.milk || 'Regular'),
              price: Number(i.price) || 0,
            }));

            const confirmTemplate = buildOrderConfirmationEmail({
              orderId: metadata.orderId,
              cafeName: cafeData?.businessName || 'Your cafe',
              items,
              total: (session.amount_total || 0) / 100,
              customerName: session.customer_details?.name || undefined,
            });

            sendEmail(customerEmail, confirmTemplate).then((r) => {
              if (!r.success) console.error(`[Webhook] Order confirmation email failed:`, r.error);
              else console.log(`[Webhook] Order confirmation sent to ${customerEmail} for order ${metadata.orderId}`);
            }).catch(() => {});
          }
        } catch (err) {
          console.error(`[Webhook] Error sending order confirmation for ${metadata.orderId}:`, err);
        }
      }

      // ── Affiliate commission tracking ──────────────────────────
      // Track commission for the cafe's affiliate (if any) on curbside orders
      try {
        const totalCents = session.amount_total || 0;
        // Platform fee is flat $0.99 per order (Model F — Flat Service Fee)
        const platformFeeCents = 99; // $0.99 platform share
        trackAffiliateCommission({
          cafeId: metadata.cafeId,
          orderId: metadata.orderId,
          orderAmountCents: totalCents,
          platformFeeCents,
        }).catch((err) => console.error(`[Webhook] Affiliate tracking error:`, err));
      } catch {
        // Non-critical — don't block webhook response
      }
    }
  }

  // Acknowledge all other events
  return NextResponse.json({ received: true });
}
