import { NextResponse } from 'next/server';
import { requireFirebaseAuth, requireAllowedOrigin, requireJsonContentType, checkRateLimit, parseJson, serverError } from '@/app/api/_lib/requestSecurity';
import { detectBot } from '@/app/api/_lib/botDefense';
import { buildSignupReceivedEmail, sendEmail } from '@/app/api/_lib/resendEmail';

interface SignupNotifyBody {
  businessName: string;
  email: string;
  abn?: string;
  address?: string;
  storePhone?: string;
  ownerMobile?: string;
  googleBusinessUrl?: string;
}

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

    const body = await parseJson<SignupNotifyBody>(req);
    if (!body) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { businessName, email, abn, address, storePhone, ownerMobile, googleBusinessUrl } = body;
    if (!businessName || !email) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (typeof email !== 'string' || !email.includes('@') || email.length > 254) {
      return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
    }

    // Send confirmation email to the applicant
    const template = buildSignupReceivedEmail({ businessName: String(businessName).slice(0, 128) });
    const result = await sendEmail(email, template);

    if (!result.success) {
      console.error(`[Signup Notify] Email failed for ${email}:`, result.error);
    } else {
      console.log(`[Signup Notify] Welcome email sent to ${email} (id: ${result.id})`);
    }

    // Send admin notification so Steven knows a new cafe applied
    const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL || 'hello@pullupcoffee.com';
    const detailRows = [
      `<p><strong>Business:</strong> ${String(businessName).slice(0, 128)}</p>`,
      `<p><strong>Email:</strong> ${email}</p>`,
      abn ? `<p><strong>ABN:</strong> ${String(abn).slice(0, 14)}</p>` : '',
      address ? `<p><strong>Address:</strong> ${String(address).slice(0, 256)}</p>` : '',
      storePhone ? `<p><strong>Store Phone:</strong> ${String(storePhone).slice(0, 20)}</p>` : '',
      ownerMobile ? `<p><strong>Owner Mobile:</strong> ${String(ownerMobile).slice(0, 20)}</p>` : '',
      googleBusinessUrl ? `<p><strong>Google Business:</strong> <a href="${String(googleBusinessUrl).slice(0, 512)}">${String(googleBusinessUrl).slice(0, 64)}</a></p>` : '',
      `<p><strong>Time:</strong> ${new Date().toISOString()}</p>`,
    ].filter(Boolean).join('\n        ');

    const adminTemplate = {
      subject: `🆕 New Cafe Application: ${String(businessName).slice(0, 64)}`,
      html: `<div style="font-family:sans-serif;padding:20px;">
        <h2 style="color:#ea580c;">New Cafe Application</h2>
        ${detailRows}
        <p style="margin-top:16px;">Log in to the admin panel to review and approve.</p>
      </div>`,
      text: `New Cafe Application\n\nBusiness: ${businessName}\nEmail: ${email}${abn ? `\nABN: ${abn}` : ''}${address ? `\nAddress: ${address}` : ''}${storePhone ? `\nStore Phone: ${storePhone}` : ''}${ownerMobile ? `\nOwner Mobile: ${ownerMobile}` : ''}\nTime: ${new Date().toISOString()}\n\nLog in to the admin panel to review and approve.`,
    };

    sendEmail(adminEmail, adminTemplate).then((r) => {
      if (!r.success) console.error(`[Signup Notify] Admin notification failed:`, r.error);
      else console.log(`[Signup Notify] Admin notified about ${businessName}`);
    }).catch(() => { /* non-critical */ });

    return NextResponse.json({ sent: result.success });
  } catch (error) {
    console.error('Signup notify error:', error);
    return serverError('Unable to send notification');
  }
}
