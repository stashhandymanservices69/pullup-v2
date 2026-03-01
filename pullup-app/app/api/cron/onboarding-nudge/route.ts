import { NextResponse } from 'next/server';
import { getAdminDb } from '@/app/api/_lib/firebaseAdmin';
import { buildOnboardingNudgeEmail, sendEmail } from '@/app/api/_lib/resendEmail';

/**
 * Onboarding Nudge Cron
 *
 * Runs daily. Finds cafes that:
 *   1. Were approved 3+ days ago
 *   2. Have never received an order (no docs in their orders subcollection)
 *   3. Haven't already received a nudge email
 *
 * Sends them a friendly "Let's get your first order!" email with checklist.
 *
 * Setup (Vercel):
 *   Add crons to vercel.json — see vercel.json in this project for config.
 */

const NUDGE_AFTER_DAYS = 3;

export async function GET(req: Request) {
  // Verify cron secret to prevent unauthorized access
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const db = getAdminDb();
    const cutoffDate = new Date(Date.now() - NUDGE_AFTER_DAYS * 24 * 60 * 60 * 1000);

    // Get all approved cafes
    const approvedSnap = await db
      .collection('cafes')
      .where('isApproved', '==', true)
      .get();

    let nudged = 0;
    let skipped = 0;
    let errors = 0;

    for (const cafeDoc of approvedSnap.docs) {
      const cafe = cafeDoc.data();

      try {
        // Skip if already nudged
        if (cafe.onboardingNudgeSent) {
          skipped++;
          continue;
        }

        // Skip if approved less than NUDGE_AFTER_DAYS ago
        const approvedAt = cafe.approvedAt?.toDate?.() || (cafe.approvedAt ? new Date(cafe.approvedAt) : null);
        if (!approvedAt || approvedAt > cutoffDate) {
          skipped++;
          continue;
        }

        // Check if they have any orders
        const ordersSnap = await db
          .collection('orders')
          .where('cafeId', '==', cafeDoc.id)
          .limit(1)
          .get();

        if (!ordersSnap.empty) {
          // They have orders — no nudge needed, mark as done
          await cafeDoc.ref.update({ onboardingNudgeSent: true });
          skipped++;
          continue;
        }

        // No orders after 3 days — send nudge email
        if (!cafe.email) {
          skipped++;
          continue;
        }

        const template = buildOnboardingNudgeEmail({
          businessName: cafe.businessName || 'Cafe',
          email: cafe.email,
        });

        const result = await sendEmail(cafe.email, template);

        if (result.success) {
          await cafeDoc.ref.update({
            onboardingNudgeSent: true,
            onboardingNudgeSentAt: new Date().toISOString(),
          });
          nudged++;
          console.log(`[Nudge] Email sent to ${cafe.email} (${cafe.businessName})`);
        } else {
          console.error(`[Nudge] Email failed for ${cafe.email}:`, result.error);
          errors++;
        }
      } catch (err) {
        console.error(`[Nudge] Error processing cafe ${cafeDoc.id}:`, err);
        errors++;
      }
    }

    return NextResponse.json({
      success: true,
      nudged,
      skipped,
      errors,
      checked: approvedSnap.size,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Onboarding nudge cron error:', error);
    return NextResponse.json({ error: 'Nudge cron failed' }, { status: 500 });
  }
}
