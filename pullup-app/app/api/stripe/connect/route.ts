import { NextResponse } from 'next/server';
import { checkRateLimit, isValidCafeId, parseJson, requireAllowedOrigin, requireJsonContentType, requireFirebaseAuth, serverError } from '@/app/api/_lib/requestSecurity';
import { getStripeClient, stripeConfigErrorResponse } from '@/app/api/_lib/stripeServer';
import { detectBot } from '@/app/api/_lib/botDefense';

export async function POST(req: Request) {
  try {
    const stripe = getStripeClient();
    if (!stripe) return stripeConfigErrorResponse();

    const originCheck = requireAllowedOrigin(req);
    if (originCheck) return originCheck;

    const botCheck = detectBot(req);
    if (botCheck) return botCheck;

    const contentTypeCheck = requireJsonContentType(req);
    if (contentTypeCheck) return contentTypeCheck;

    // AUTHENTICATION REQUIRED — only signed-in cafe owners can create connect accounts
    const authResult = await requireFirebaseAuth(req);
    if (authResult instanceof NextResponse) return authResult;

    const limited = checkRateLimit(req, 'stripe-connect', 5, 60_000);
    if (limited) return limited;

    const body = await parseJson<{ email: string; businessName?: string; cafeId?: string; referralCode?: string }>(req);
    if (!body) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { email, businessName, cafeId, referralCode } = body;

    if (typeof email !== 'string' || !email.includes('@') || email.length > 254) {
      return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
    }

    // Validate cafeId format (prevent Firestore path traversal)
    if (cafeId !== undefined && !isValidCafeId(cafeId)) {
      return NextResponse.json({ error: 'Invalid cafeId' }, { status: 400 });
    }

    // Create a Stripe Express account for the Cafe
    const account = await stripe.accounts.create({
      type: 'express',
      email,
      business_profile: { name: typeof businessName === 'string' ? businessName.slice(0, 128) : 'Cafe Partner' },
      metadata: { 
        referred_by: typeof referralCode === 'string' ? referralCode.slice(0, 64) : 'organic_signup',
        firebase_uid: cafeId || authResult.uid,
      } 
    });

    const origin = req.headers.get('origin') as string;
    
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${origin}/`,
      return_url: `${origin}/`,
      type: 'account_onboarding',
    });

    return NextResponse.json({ url: accountLink.url, accountId: account.id });

  } catch (error: unknown) {
    console.error('Stripe connect error:', error);
    return serverError('Unable to create connected Stripe account');
  }
}
