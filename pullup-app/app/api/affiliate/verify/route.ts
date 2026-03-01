import { NextResponse } from 'next/server';
import { requireAllowedOrigin, requireJsonContentType, checkRateLimit, parseJson, serverError } from '@/app/api/_lib/requestSecurity';
import { verifyReferralCode } from '@/app/api/_lib/affiliateTracker';

/**
 * Verify Referral Code — POST
 * Checks if a referral code is valid during cafe signup.
 */

export async function POST(req: Request) {
  try {
    const originCheck = requireAllowedOrigin(req);
    if (originCheck) return originCheck;

    const contentTypeCheck = requireJsonContentType(req);
    if (contentTypeCheck) return contentTypeCheck;

    const limited = checkRateLimit(req, 'verify-referral', 20, 60_000);
    if (limited) return limited;

    const body = await parseJson<{ code: string }>(req);
    if (!body?.code) {
      return NextResponse.json({ valid: false, error: 'Code is required' }, { status: 400 });
    }

    const result = await verifyReferralCode(body.code);
    return NextResponse.json(result);
  } catch (error) {
    console.error('[Verify Referral] Error:', error);
    return serverError('Unable to verify referral code');
  }
}
