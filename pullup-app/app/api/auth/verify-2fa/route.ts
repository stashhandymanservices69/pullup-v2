import { NextResponse } from 'next/server';
import { getAdminDb } from '@/app/api/_lib/firebaseAdmin';
import { requireAllowedOrigin, requireJsonContentType, checkRateLimit, parseJson, isValidCafeId, serverError } from '@/app/api/_lib/requestSecurity';
import { detectBot } from '@/app/api/_lib/botDefense';
import crypto from 'crypto';

export async function POST(req: Request) {
  try {
    const originCheck = requireAllowedOrigin(req);
    if (originCheck) return originCheck;

    const botCheck = detectBot(req);
    if (botCheck) return botCheck;

    const contentTypeCheck = requireJsonContentType(req);
    if (contentTypeCheck) return contentTypeCheck;

    // Aggressive rate limiting — 5 attempts per 5 minutes per IP
    const limited = checkRateLimit(req, 'verify-2fa', 5, 300_000);
    if (limited) return limited;

    const body = await parseJson<{ cafeId: string; code: string }>(req);
    if (!body) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    const { cafeId, code } = body;

    if (!cafeId || !isValidCafeId(cafeId)) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    if (typeof code !== 'string' || !/^\d{6}$/.test(code)) {
      return NextResponse.json({ error: 'Code must be 6 digits' }, { status: 400 });
    }

    const db = getAdminDb();
    const cafeDoc = await db.collection('cafes').doc(cafeId).get();

    if (!cafeDoc.exists) {
      // Don't reveal whether account exists
      return NextResponse.json({ error: 'Verification failed' }, { status: 400 });
    }

    const cafe = cafeDoc.data()!;

    if (!cafe.pending2faHash || !cafe.pending2faExpiry) {
      return NextResponse.json({ error: 'No pending verification. Request a new code.' }, { status: 400 });
    }

    // Check expiry
    if (new Date(cafe.pending2faExpiry) < new Date()) {
      await db.collection('cafes').doc(cafeId).update({
        pending2faHash: null,
        pending2faExpiry: null,
      });
      return NextResponse.json({ error: 'Code expired. Please request a new one.' }, { status: 400 });
    }

    // Verify hash
    const hash = crypto.createHash('sha256').update(code).digest('hex');

    if (hash !== cafe.pending2faHash) {
      return NextResponse.json({ error: 'Incorrect code. Please try again.' }, { status: 400 });
    }

    // Success — clear pending 2FA data
    await db.collection('cafes').doc(cafeId).update({
      pending2faHash: null,
      pending2faExpiry: null,
    });

    console.log(`[2FA] Verified successfully for cafe ${cafeId}`);
    return NextResponse.json({ verified: true });
  } catch (error) {
    console.error('Verify 2FA error:', error);
    return serverError('Verification failed');
  }
}
