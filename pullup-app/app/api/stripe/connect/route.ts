import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { checkRateLimit, parseJson, requireAllowedOrigin, requireJsonContentType, serverError } from '@/app/api/_lib/requestSecurity';

// 1. Wake up Stripe using our secure vault key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2026-01-28.clover',
});

export async function POST(req: Request) {
  try {
    const originCheck = requireAllowedOrigin(req);
    if (originCheck) return originCheck;

    const contentTypeCheck = requireJsonContentType(req);
    if (contentTypeCheck) return contentTypeCheck;

    const limited = checkRateLimit(req, 'stripe-connect', 10, 60_000);
    if (limited) return limited;

    // 2. Read the data sent from our Cafe Dashboard
    const body = await parseJson<{ email: string; businessName?: string; cafeId?: string; referralCode?: string }>(req);
    if (!body) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { email, businessName, cafeId, referralCode } = body;

    if (typeof email !== 'string' || !email.includes('@') || email.length > 254) {
      return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
    }

    console.log("Creating Stripe Account for:", businessName);

    // 3. Create a Stripe Express account for the Cafe (with Affiliate Scout tracking!)
    const account = await stripe.accounts.create({
      type: 'express',
      email,
      business_profile: { name: typeof businessName === 'string' ? businessName.slice(0, 128) : 'Cafe Partner' },
      metadata: { 
        referred_by: typeof referralCode === 'string' ? referralCode.slice(0, 64) : 'organic_signup',
        firebase_uid: typeof cafeId === 'string' ? cafeId.slice(0, 128) : 'unknown'
      } 
    });

    // 4. Generate the secure onboarding link for them to enter their Bank Details
    const origin = req.headers.get('origin') as string;
    
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${origin}/`,
      return_url: `${origin}/`,
      type: 'account_onboarding',
    });

    // 5. Send the link back to the website so they can click it
    return NextResponse.json({ url: accountLink.url, accountId: account.id });

  } catch (error: unknown) {
    console.error("Stripe Error:", error);
    return serverError('Unable to create connected Stripe account');
  }
}
