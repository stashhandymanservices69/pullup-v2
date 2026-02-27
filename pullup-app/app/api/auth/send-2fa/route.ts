import { NextResponse } from 'next/server';
import { getAdminDb } from '@/app/api/_lib/firebaseAdmin';
import { requireFirebaseAuth, requireAllowedOrigin, checkRateLimit, serverError } from '@/app/api/_lib/requestSecurity';
import { detectBot } from '@/app/api/_lib/botDefense';
import crypto from 'crypto';
import twilio from 'twilio';

const normalizeAuNumber = (raw: string) => {
  const digits = raw.replace(/\s+/g, '').replace(/[^\d+]/g, '');
  if (digits.startsWith('+')) return digits;
  if (digits.startsWith('04')) return `+61${digits.slice(1)}`;
  if (digits.startsWith('61')) return `+${digits}`;
  return digits;
};

export async function POST(req: Request) {
  try {
    const originCheck = requireAllowedOrigin(req);
    if (originCheck) return originCheck;

    const botCheck = detectBot(req);
    if (botCheck) return botCheck;

    // Must be signed in to request 2FA code
    const authResult = await requireFirebaseAuth(req);
    if (authResult instanceof NextResponse) return authResult;

    const limited = checkRateLimit(req, 'send-2fa', 3, 300_000); // 3 per 5 min
    if (limited) return limited;

    const uid = authResult.uid;
    const db = getAdminDb();
    const cafeDoc = await db.collection('cafes').doc(uid).get();

    if (!cafeDoc.exists) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    const cafe = cafeDoc.data()!;

    if (!cafe.sms2faEnabled) {
      return NextResponse.json({ error: '2FA not enabled for this account' }, { status: 400 });
    }

    if (!cafe.phone) {
      return NextResponse.json({ error: 'No mobile number on file. Update your phone in Account settings first.' }, { status: 400 });
    }

    // Generate cryptographically secure 6-digit code
    const code = crypto.randomInt(100000, 999999).toString();
    const hash = crypto.createHash('sha256').update(code).digest('hex');
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    // Save hash + expiry to Firestore
    await db.collection('cafes').doc(uid).update({
      pending2faHash: hash,
      pending2faExpiry: expiresAt,
    });

    // Send SMS via Twilio
    const sid = process.env.TWILIO_ACCOUNT_SID;
    const token = process.env.TWILIO_AUTH_TOKEN;
    const from = process.env.TWILIO_FROM_NUMBER;

    if (!sid || !token || !from) {
      console.log(`[2FA SIMULATION] Code: ${code} → ${cafe.phone}`);
      return NextResponse.json({ sent: true, simulated: true });
    }

    const client = twilio(sid, token);
    const normalizedPhone = normalizeAuNumber(cafe.phone);

    await client.messages.create({
      to: normalizedPhone,
      from,
      body: `Pull Up Coffee: Your login code is ${code}. Valid for 5 minutes. Do not share this code.`,
    });

    console.log(`[2FA] Code sent to ${normalizedPhone} for cafe ${uid}`);
    return NextResponse.json({ sent: true });
  } catch (error) {
    console.error('Send 2FA error:', error);
    return serverError('Unable to send verification code');
  }
}
