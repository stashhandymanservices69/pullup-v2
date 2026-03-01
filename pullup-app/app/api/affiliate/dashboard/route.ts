import { NextResponse } from 'next/server';
import { requireAllowedOrigin, requireJsonContentType, checkRateLimit, parseJson, serverError } from '@/app/api/_lib/requestSecurity';
import { detectBot } from '@/app/api/_lib/botDefense';
import { getAdminDb } from '@/app/api/_lib/firebaseAdmin';

/**
 * Affiliate Dashboard — POST
 * Authenticates an affiliate by email + referral code and returns their stats.
 */

export async function POST(req: Request) {
  try {
    const originCheck = requireAllowedOrigin(req);
    if (originCheck) return originCheck;

    const botCheck = detectBot(req);
    if (botCheck) return botCheck;

    const contentTypeCheck = requireJsonContentType(req);
    if (contentTypeCheck) return contentTypeCheck;

    const limited = checkRateLimit(req, 'affiliate-dashboard', 20, 60_000);
    if (limited) return limited;

    const body = await parseJson<{ email: string; referralCode: string }>(req);
    if (!body?.email || !body?.referralCode) {
      return NextResponse.json({ error: 'Email and referral code are required' }, { status: 400 });
    }

    const db = getAdminDb();

    // Look up affiliate by referral code
    const snap = await db.collection('affiliates')
      .where('referralCode', '==', body.referralCode.toUpperCase().trim())
      .where('email', '==', body.email.toLowerCase().trim())
      .limit(1)
      .get();

    if (snap.empty) {
      return NextResponse.json({ error: 'Invalid email or referral code' }, { status: 401 });
    }

    const affiliate = snap.docs[0].data();
    const affiliateId = snap.docs[0].id;

    // Get commission history
    const commissions = await db.collection('affiliate_commissions')
      .where('affiliateId', '==', affiliateId)
      .orderBy('createdAt', 'desc')
      .limit(100)
      .get();

    const commissionList = commissions.docs.map(doc => {
      const d = doc.data();
      return {
        id: doc.id,
        cafeId: d.cafeId,
        cafeName: d.cafeName || 'Unknown',
        orderId: d.orderId,
        orderAmountCents: d.orderAmountCents || 0,
        platformFeeCents: d.platformFeeCents || 0,
        commissionCents: d.commissionCents || 0,
        createdAt: d.createdAt,
        status: d.status || 'pending',
      };
    });

    // Get referred cafes details
    const referredCafeIds: string[] = affiliate.referredCafes || [];
    const cafeDetails: Array<{ id: string; name: string; firstOrder: string | null; windowEnd: string | null; totalOrders: number }> = [];

    for (const cafeId of referredCafeIds.slice(0, 20)) {
      try {
        const cafeDoc = await db.collection('cafes').doc(cafeId).get();
        if (cafeDoc.exists) {
          const cd = cafeDoc.data()!;
          cafeDetails.push({
            id: cafeId,
            name: cd.businessName || 'Unknown Cafe',
            firstOrder: cd.affiliateWindowStart || null,
            windowEnd: cd.affiliateWindowEnd || null,
            totalOrders: cd.affiliatePeriodOrders || 0,
          });
        }
      } catch {
        // Skip inaccessible cafes
      }
    }

    return NextResponse.json({
      affiliate: {
        name: affiliate.name,
        email: affiliate.email,
        referralCode: affiliate.referralCode,
        status: affiliate.status,
        createdAt: affiliate.createdAt,
        totalCommissionCents: affiliate.totalCommissionCents || 0,
        totalReferrals: affiliate.totalReferrals || 0,
        paidOutCents: affiliate.paidOutCents || 0,
      },
      referredCafes: cafeDetails,
      recentCommissions: commissionList.slice(0, 50),
      summary: {
        totalEarnedCents: affiliate.totalCommissionCents || 0,
        totalPaidCents: affiliate.paidOutCents || 0,
        pendingCents: (affiliate.totalCommissionCents || 0) - (affiliate.paidOutCents || 0),
        totalCafes: referredCafeIds.length,
        activeCafes: cafeDetails.filter(c => {
          if (!c.windowEnd) return false;
          return new Date(c.windowEnd) > new Date();
        }).length,
      },
    });
  } catch (error) {
    console.error('[Affiliate Dashboard] Error:', error);
    return serverError('Unable to load affiliate dashboard');
  }
}
