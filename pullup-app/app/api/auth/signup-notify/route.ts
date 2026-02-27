import { NextResponse } from 'next/server';
import { requireFirebaseAuth, requireAllowedOrigin, requireJsonContentType, checkRateLimit, parseJson, serverError } from '@/app/api/_lib/requestSecurity';
import { detectBot } from '@/app/api/_lib/botDefense';
import { buildSignupReceivedEmail, sendEmail } from '@/app/api/_lib/resendEmail';

export async function POST(req: Request) {
  try {
    const originCheck = requireAllowedOrigin(req);
    if (originCheck) return originCheck;

    const botCheck = detectBot(req);
    if (botCheck) return botCheck;

    const contentTypeCheck = requireJsonContentType(req);
    if (contentTypeCheck) return contentTypeCheck;

    // Must be signed in (freshly created account)
    const authResult = await requireFirebaseAuth(req);
    if (authResult instanceof NextResponse) return authResult;

    const limited = checkRateLimit(req, 'signup-notify', 3, 300_000);
    if (limited) return limited;

    const body = await parseJson<{ businessName: string; email: string }>(req);
    if (!body) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { businessName, email } = body;
    if (!businessName || !email) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (typeof email !== 'string' || !email.includes('@') || email.length > 254) {
      return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
    }

    const template = buildSignupReceivedEmail({ businessName: String(businessName).slice(0, 128) });
    const result = await sendEmail(email, template);

    if (!result.success) {
      console.error(`[Signup Notify] Email failed for ${email}:`, result.error);
    } else {
      console.log(`[Signup Notify] Welcome email sent to ${email} (id: ${result.id})`);
    }

    return NextResponse.json({ sent: result.success });
  } catch (error) {
    console.error('Signup notify error:', error);
    return serverError('Unable to send notification');
  }
}
