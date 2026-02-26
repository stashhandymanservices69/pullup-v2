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

    const limited = checkRateLimit(req, 'stripe-checkout-confirm', 20, 60_000);
    if (limited) return limited;

    const body = await parseJson<{ sessionId: string }>(req);
    if (!body) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { sessionId } = body;
    if (!sessionId) {
      return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 });
    }

    if (typeof sessionId !== 'string' || !/^cs_[a-zA-Z0-9_]+$/.test(sessionId)) {
      return NextResponse.json({ error: 'Invalid sessionId format' }, { status: 400 });
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);
    return NextResponse.json({
      paymentIntentId: session.payment_intent,
      paymentStatus: session.payment_status,
      sessionStatus: session.status,
    });
  } catch (error: unknown) {
    console.error('Stripe checkout confirm error:', error);
    return serverError('Unable to confirm checkout session');
  }
}
