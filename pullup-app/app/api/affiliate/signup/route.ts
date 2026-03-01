import { NextResponse } from 'next/server';
import { requireAllowedOrigin, requireJsonContentType, checkRateLimit, parseJson, serverError } from '@/app/api/_lib/requestSecurity';
import { detectBot } from '@/app/api/_lib/botDefense';
import { getAdminDb } from '@/app/api/_lib/firebaseAdmin';
import { buildAffiliateWelcomeEmail, sendEmail } from '@/app/api/_lib/resendEmail';

/**
 * Affiliate Signup — POST
 * Creates an affiliate account, auto-approves, and sends welcome email
 * with the unique referral code.
 */

function generateReferralCode(name: string): string {
  const clean = name.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 10);
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `PULLUP-${clean || 'AFF'}-${suffix}`;
}

export async function POST(req: Request) {
  try {
    const originCheck = requireAllowedOrigin(req);
    if (originCheck) return originCheck;

    const botCheck = detectBot(req);
    if (botCheck) return botCheck;

    const contentTypeCheck = requireJsonContentType(req);
    if (contentTypeCheck) return contentTypeCheck;

    const limited = checkRateLimit(req, 'affiliate-signup', 3, 300_000);
    if (limited) return limited;

    const body = await parseJson<{
      name: string;
      email: string;
      phone: string;
      country?: string;
      channels?: string;
      preferredCode?: string;
    }>(req);

    if (!body) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { name, email, phone, country, channels, preferredCode } = body;

    if (!name || !email || !phone) {
      return NextResponse.json({ error: 'Name, email, and phone are required' }, { status: 400 });
    }

    if (typeof email !== 'string' || !email.includes('@') || email.length > 254) {
      return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
    }

    if (typeof name !== 'string' || name.length < 2 || name.length > 128) {
      return NextResponse.json({ error: 'Invalid name' }, { status: 400 });
    }

    const db = getAdminDb();

    // Check if email is already registered as affiliate
    const existing = await db.collection('affiliates')
      .where('email', '==', email.toLowerCase().trim())
      .limit(1)
      .get();

    if (!existing.empty) {
      const existingData = existing.docs[0].data();
      return NextResponse.json({
        error: 'This email is already registered as an affiliate.',
        referralCode: existingData.referralCode,
      }, { status: 409 });
    }

    // Generate unique referral code
    let referralCode = preferredCode
      ? `PULLUP-${preferredCode.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12)}`
      : generateReferralCode(name);

    // Ensure uniqueness
    const codeCheck = await db.collection('affiliates')
      .where('referralCode', '==', referralCode)
      .limit(1)
      .get();

    if (!codeCheck.empty) {
      referralCode = generateReferralCode(name); // Regenerate with random suffix
    }

    // Create affiliate document — auto-approved
    const affiliateData = {
      name: String(name).slice(0, 128),
      email: email.toLowerCase().trim(),
      phone: String(phone).slice(0, 20),
      country: String(country || 'AU').slice(0, 4).toUpperCase(),
      channels: String(channels || '').slice(0, 500),
      referralCode,
      status: 'active', // Auto-approve
      createdAt: new Date().toISOString(),
      approvedAt: new Date().toISOString(),
      totalCommissionCents: 0,
      totalReferrals: 0,
      referredCafes: [],
      paidOutCents: 0,
    };

    const docRef = await db.collection('affiliates').add(affiliateData);
    console.log(`[Affiliate] New affiliate: ${name} (${email}) — code: ${referralCode} — id: ${docRef.id}`);

    // Send welcome email with referral code
    const template = buildAffiliateWelcomeEmail({
      name: String(name).slice(0, 128),
      referralCode,
      email: email.toLowerCase().trim(),
    });

    sendEmail(email, template).then((r) => {
      if (!r.success) console.error(`[Affiliate] Welcome email failed for ${email}:`, r.error);
      else console.log(`[Affiliate] Welcome email sent to ${email}`);
    }).catch(() => {});

    // Notify admin
    const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL || 'hello@pullupcoffee.com';
    sendEmail(adminEmail, {
      subject: `🤝 New Affiliate: ${name}`,
      html: `<div style="font-family:sans-serif;padding:20px;">
        <h2 style="color:#ea580c;">New Affiliate Signup</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Phone:</strong> ${phone}</p>
        <p><strong>Country:</strong> ${country || 'AU'}</p>
        <p><strong>Code:</strong> ${referralCode}</p>
        <p><strong>Channels:</strong> ${channels || 'Not specified'}</p>
        <p><strong>Status:</strong> Auto-approved</p>
      </div>`,
      text: `New Affiliate: ${name} | ${email} | Code: ${referralCode}`,
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      referralCode,
      message: 'Welcome! Your affiliate account is active. Check your email for your referral code and instructions.',
    });
  } catch (error) {
    console.error('[Affiliate Signup] Error:', error);
    return serverError('Unable to process affiliate signup');
  }
}
