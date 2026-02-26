import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { checkRateLimit, parseJson, requireAllowedOrigin, requireJsonContentType, serverError } from '@/app/api/_lib/requestSecurity';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2026-01-28.clover',
});

export async function POST(req: Request) {
  try {
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
