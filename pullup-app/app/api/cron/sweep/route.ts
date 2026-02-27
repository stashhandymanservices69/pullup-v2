import { NextResponse } from 'next/server';
import { getAdminDb } from '@/app/api/_lib/firebaseAdmin';
import { getStripeClient } from '@/app/api/_lib/stripeServer';

/**
 * Ghost-Hold Sweeper
 * 
 * Runs on a cron schedule (every 6 hours) to find orders that are still
 * in "pending" status with an authorization hold older than 72 hours.
 * These ghost holds are automatically cancelled (auth voided) and the
 * order status is set to "expired".
 *
 * This prevents orphaned payment authorizations from blocking customer
 * funds indefinitely when a cafe fails to accept or decline an order.
 */

const GHOST_HOLD_MAX_AGE_MS = 72 * 60 * 60 * 1000; // 72 hours

export async function GET(req: Request) {
  // Verify cron secret to prevent unauthorized access
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const db = getAdminDb();
    const stripe = getStripeClient();
    const now = Date.now();
    const cutoff = new Date(now - GHOST_HOLD_MAX_AGE_MS).toISOString();

    // Query orders that are still pending and older than cutoff
    const pendingSnap = await db
      .collection('orders')
      .where('status', '==', 'pending')
      .where('timestamp', '<=', cutoff)
      .get();

    let swept = 0;
    let errors = 0;

    for (const docSnap of pendingSnap.docs) {
      const order = docSnap.data();
      try {
        // Cancel the Stripe payment intent if it exists
        if (stripe && order.paymentIntentId) {
          try {
            await stripe.paymentIntents.cancel(order.paymentIntentId);
          } catch (stripeErr: unknown) {
            // Intent may already be cancelled or expired — that's OK
            console.warn(`Stripe cancel for ${order.paymentIntentId}:`, stripeErr);
          }
        }

        // Update order status to expired
        await docSnap.ref.update({
          status: 'expired',
          paymentState: 'voided',
          statusNote: 'Auto-expired: cafe did not respond within 72 hours. Authorization released.',
          statusUpdatedAt: new Date().toISOString(),
          sweptAt: new Date().toISOString(),
        });

        swept++;
      } catch (err) {
        console.error(`Failed to sweep order ${docSnap.id}:`, err);
        errors++;
      }
    }

    return NextResponse.json({
      success: true,
      swept,
      errors,
      checked: pendingSnap.size,
      cutoffISO: cutoff,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Ghost-hold sweep error:', error);
    return NextResponse.json(
      { error: 'Sweep failed' },
      { status: 500 }
    );
  }
}
