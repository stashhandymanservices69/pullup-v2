import { NextResponse } from 'next/server';
import { getAdminApp } from '@/app/api/_lib/firebaseAdmin';
import { getAuth } from 'firebase-admin/auth';
import { requireAllowedOrigin, requireJsonContentType, checkRateLimit, parseJson, serverError } from '@/app/api/_lib/requestSecurity';
import { detectBot } from '@/app/api/_lib/botDefense';
import { buildPasswordResetEmail, sendEmail } from '@/app/api/_lib/resendEmail';

export async function POST(req: Request) {
  try {
    const originCheck = requireAllowedOrigin(req);
    if (originCheck) return originCheck;

    const botCheck = detectBot(req);
    if (botCheck) return botCheck;

    const contentTypeCheck = requireJsonContentType(req);
    if (contentTypeCheck) return contentTypeCheck;

    // Rate limit: 3 per 5 minutes per IP
    const limited = checkRateLimit(req, 'reset-password', 3, 300_000);
    if (limited) return limited;

    const body = await parseJson<{ email: string }>(req);
    if (!body || !body.email) {
      return NextResponse.json({ error: 'Email required' }, { status: 400 });
    }

    const { email } = body;
    if (typeof email !== 'string' || !email.includes('@') || email.length > 254) {
      return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
    }

    try {
      // Generate reset link via Firebase Admin
      const auth = getAuth(getAdminApp());
      const resetLink = await auth.generatePasswordResetLink(email);

      // Send branded email via Resend
      const template = buildPasswordResetEmail(email, resetLink);
      const result = await sendEmail(email, template);

      if (!result.success) {
        console.error('[Reset] Email failed:', result.error);
      } else {
        console.log(`[Reset] Branded email sent to ${email} (id: ${result.id})`);
      }
    } catch (err: unknown) {
      // Don't reveal whether user exists — always return success
      const code = (err as { code?: string })?.code;
      if (code === 'auth/user-not-found' || code === 'auth/invalid-email') {
        console.log(`[Reset] Silently ignored: ${code}`);
      } else {
        console.error('[Reset] Error:', err);
      }
    }

    // Always return success to prevent email enumeration
    return NextResponse.json({ sent: true });
  } catch (error) {
    console.error('Reset password error:', error);
    return serverError('Unable to process request');
  }
}
