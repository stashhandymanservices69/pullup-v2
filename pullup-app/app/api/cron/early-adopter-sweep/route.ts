import { NextResponse } from 'next/server';
import { getAdminDb } from '@/app/api/_lib/firebaseAdmin';

/**
 * Early Adopter Activity Sweep
 *
 * Runs on a cron schedule (daily) to check early adopter cafes that
 * haven't shown activity within 30 days of approval.
 *
 * "Activity" means at least ONE of:
 *   - Completed at least 1 order
 *   - Added or edited menu items (menuLastEditedAt)
 *   - Has logged in recently (lastLoginAt within 30 days of approval)
 *
 * If a cafe has earlyAdopterEligible = true AND was approved > 30 days ago
 * AND has zero orders AND no menu edits AND no recent login, their
 * early adopter status is revoked. The spot goes back to someone else.
 */

const ACTIVITY_DEADLINE_DAYS = 30;

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const db = getAdminDb();

    // Get all early adopter cafes that are approved
    const cafesSnap = await db.collection('cafes')
      .where('earlyAdopterEligible', '==', true)
      .where('isApproved', '==', true)
      .get();

    const now = Date.now();
    const deadlineMs = ACTIVITY_DEADLINE_DAYS * 24 * 60 * 60 * 1000;
    let revokedCount = 0;
    const revokedCafes: string[] = [];

    for (const cafeDoc of cafesSnap.docs) {
      const data = cafeDoc.data();

      // Skip platform admins
      if (data.isPlatformAdmin || data.role === 'platform_admin') continue;

      // Already revoked?
      if (data.earlyAdopterRevoked) continue;

      // Check if approval was > 30 days ago
      const approvedAt = data.firstApprovedAt
        ? new Date(data.firstApprovedAt).getTime()
        : data.approvedAt
          ? new Date(data.approvedAt).getTime()
          : null;

      if (!approvedAt) continue; // not yet approved with timestamp
      if (now - approvedAt < deadlineMs) continue; // still within grace period

      // Check for activity signals
      let hasActivity = false;

      // 1. Any completed orders?
      const ordersSnap = await db.collection('orders')
        .where('cafeId', '==', cafeDoc.id)
        .where('status', 'in', ['completed', 'accepted', 'ready'])
        .limit(1)
        .get();
      if (!ordersSnap.empty) hasActivity = true;

      // 2. Menu edits?
      if (!hasActivity && data.menuLastEditedAt) {
        const editedAt = new Date(data.menuLastEditedAt).getTime();
        if (editedAt > approvedAt) hasActivity = true;
      }

      // 3. Any menu items added beyond defaults?
      if (!hasActivity) {
        const menuSnap = await db.collection('cafes').doc(cafeDoc.id).collection('menu').get();
        // Default menu has 8 items — if they've added/modified any, that counts as effort
        if (menuSnap.size > 8 || menuSnap.docs.some(d => d.data().editedAt)) hasActivity = true;
      }

      // 4. Recent login after approval?
      if (!hasActivity && data.lastLoginAt) {
        const loginAt = new Date(data.lastLoginAt).getTime();
        if (loginAt > approvedAt + 24 * 60 * 60 * 1000) hasActivity = true; // logged in after first day
      }

      if (!hasActivity) {
        // Revoke early adopter status — spot goes back to the pool
        await cafeDoc.ref.update({
          earlyAdopterEligible: false,
          earlyAdopterRevoked: true,
          earlyAdopterRevokedAt: new Date().toISOString(),
          earlyAdopterRevokedReason: `No activity within ${ACTIVITY_DEADLINE_DAYS} days of approval`,
          transactionCostModel: 'standard-service-fee',
          earlyPartnerRebate: 0,
        });
        revokedCount++;
        revokedCafes.push(`${data.businessName || cafeDoc.id} (${data.email})`);
      }
    }

    return NextResponse.json({
      ok: true,
      checked: cafesSnap.size,
      revoked: revokedCount,
      revokedCafes,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('Early adopter sweep error:', err);
    return NextResponse.json({ error: err.message || 'Sweep failed' }, { status: 500 });
  }
}
