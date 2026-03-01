import { getAdminDb } from '@/app/api/_lib/firebaseAdmin';

/**
 * Affiliate Commission Tracker
 *
 * Called after a successful order payment to check if the cafe has an
 * active affiliate within the 30-day commission window.
 *
 * Commission: 25% of platform fee ($0.99 flat service fee ≈ $0.25/order)
 *
 * This is a library function, not a route — called from webhook/capture.
 */

interface TrackCommissionInput {
  cafeId: string;
  orderId: string;
  orderAmountCents: number;
  platformFeeCents: number;
  cafeName?: string;
}

export async function trackAffiliateCommission(input: TrackCommissionInput): Promise<{ tracked: boolean; commissionCents?: number }> {
  try {
    const db = getAdminDb();
    const { cafeId, orderId, orderAmountCents, platformFeeCents, cafeName } = input;

    // Get cafe document to check for affiliate referral
    const cafeDoc = await db.collection('cafes').doc(cafeId).get();
    if (!cafeDoc.exists) return { tracked: false };

    const cafeData = cafeDoc.data()!;
    const affiliateId = cafeData.affiliateId;
    const referredBy = cafeData.referredBy;

    if (!affiliateId && !referredBy) return { tracked: false };

    // Check if within the 30-day commission window
    let windowStart = cafeData.affiliateWindowStart;
    let windowEnd = cafeData.affiliateWindowEnd;

    // If this is the first order and the cafe has an affiliate, start the window
    if (!windowStart && (affiliateId || referredBy)) {
      windowStart = new Date().toISOString();
      windowEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

      await cafeDoc.ref.update({
        affiliateWindowStart: windowStart,
        affiliateWindowEnd: windowEnd,
        affiliatePeriodOrders: 1,
      });
    } else if (windowStart) {
      // Update order count
      await cafeDoc.ref.update({
        affiliatePeriodOrders: (cafeData.affiliatePeriodOrders || 0) + 1,
      });
    }

    // Check if window has expired
    if (windowEnd && new Date(windowEnd) < new Date()) {
      console.log(`[Affiliate] Commission window expired for cafe ${cafeId}`);
      return { tracked: false };
    }

    // Calculate commission: 25% of platform fee
    const commissionCents = Math.round(platformFeeCents * 0.25);

    if (commissionCents <= 0) return { tracked: false };

    // Find the affiliate document
    let affiliateDocId = affiliateId;
    if (!affiliateDocId && referredBy) {
      const affSnap = await db.collection('affiliates')
        .where('referralCode', '==', referredBy)
        .limit(1)
        .get();

      if (affSnap.empty) {
        console.warn(`[Affiliate] Referral code ${referredBy} not found for cafe ${cafeId}`);
        return { tracked: false };
      }
      affiliateDocId = affSnap.docs[0].id;

      // Cache the affiliateId on the cafe for faster lookups
      await cafeDoc.ref.update({ affiliateId: affiliateDocId });
    }

    if (!affiliateDocId) return { tracked: false };

    // Create commission record
    await db.collection('affiliate_commissions').add({
      affiliateId: affiliateDocId,
      cafeId,
      cafeName: cafeName || cafeData.businessName || 'Unknown',
      orderId,
      orderAmountCents,
      platformFeeCents,
      commissionCents,
      createdAt: new Date().toISOString(),
      status: 'pending', // 'pending' | 'paid'
    });

    // Update affiliate totals
    const affiliateRef = db.collection('affiliates').doc(affiliateDocId);
    const affiliateDoc = await affiliateRef.get();
    if (affiliateDoc.exists) {
      const affData = affiliateDoc.data()!;
      await affiliateRef.update({
        totalCommissionCents: (affData.totalCommissionCents || 0) + commissionCents,
      });
    }

    console.log(`[Affiliate] Commission $${(commissionCents / 100).toFixed(2)} tracked for affiliate ${affiliateDocId} on order ${orderId}`);
    return { tracked: true, commissionCents };
  } catch (error) {
    console.error('[Affiliate] Commission tracking error:', error);
    return { tracked: false };
  }
}

/**
 * Verify a referral code is valid and active.
 * Called during cafe signup to validate the code.
 */
export async function verifyReferralCode(code: string): Promise<{ valid: boolean; affiliateName?: string }> {
  try {
    if (!code || code.length < 3) return { valid: false };

    const db = getAdminDb();
    const snap = await db.collection('affiliates')
      .where('referralCode', '==', code.toUpperCase().trim())
      .where('status', '==', 'active')
      .limit(1)
      .get();

    if (snap.empty) return { valid: false };

    const affiliate = snap.docs[0].data();
    return { valid: true, affiliateName: affiliate.name };
  } catch {
    return { valid: false };
  }
}

/**
 * Link a cafe to an affiliate after signup.
 * Called from the signup process when a referral code is provided.
 */
export async function linkCafeToAffiliate(cafeId: string, referralCode: string): Promise<boolean> {
  try {
    const db = getAdminDb();

    const snap = await db.collection('affiliates')
      .where('referralCode', '==', referralCode.toUpperCase().trim())
      .where('status', '==', 'active')
      .limit(1)
      .get();

    if (snap.empty) return false;

    const affiliateDoc = snap.docs[0];
    const affiliateData = affiliateDoc.data();

    // Update cafe with affiliate info
    await db.collection('cafes').doc(cafeId).update({
      referredBy: referralCode.toUpperCase().trim(),
      affiliateId: affiliateDoc.id,
    });

    // Update affiliate's referred cafes list & count
    const referredCafes = affiliateData.referredCafes || [];
    if (!referredCafes.includes(cafeId)) {
      await affiliateDoc.ref.update({
        referredCafes: [...referredCafes, cafeId],
        totalReferrals: (affiliateData.totalReferrals || 0) + 1,
      });
    }

    console.log(`[Affiliate] Cafe ${cafeId} linked to affiliate ${affiliateDoc.id} (code: ${referralCode})`);
    return true;
  } catch (error) {
    console.error('[Affiliate] Link error:', error);
    return false;
  }
}
