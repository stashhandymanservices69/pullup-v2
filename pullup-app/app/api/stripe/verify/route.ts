import { NextResponse } from 'next/server';
import { checkRateLimit, parseJson, requireAllowedOrigin, requireJsonContentType, serverError } from '@/app/api/_lib/requestSecurity';
import { getStripeClient, stripeConfigErrorResponse } from '@/app/api/_lib/stripeServer';

export async function POST(req: Request) {
  try {
    const stripe = getStripeClient();
    if (!stripe) return stripeConfigErrorResponse();

    const originCheck = requireAllowedOrigin(req);
    if (originCheck) return originCheck;

    const contentTypeCheck = requireJsonContentType(req);
    if (contentTypeCheck) return contentTypeCheck;

    const limited = checkRateLimit(req, 'stripe-verify', 15, 60_000);
    if (limited) return limited;

    const body = await parseJson<{ stripeId: string }>(req);
    if (!body) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { stripeId } = body;
    if (typeof stripeId !== 'string' || !/^acct_[a-zA-Z0-9]+$/.test(stripeId)) {
      return NextResponse.json({ error: 'Invalid stripeId' }, { status: 400 });
    }

    const account = await stripe.accounts.retrieve(stripeId);
    
    // Check if they can actually receive money
    const isReady = account.charges_enabled && account.payouts_enabled;
    
    return NextResponse.json({ isReady });
  } catch (error: unknown) {
    console.error("Verification Error:", error);
    return serverError('Unable to verify Stripe account');
  }
}
