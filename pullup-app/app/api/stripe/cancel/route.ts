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

    const limited = checkRateLimit(req, 'stripe-cancel', 12, 60_000);
    if (limited) return limited;

    const body = await parseJson<{ paymentIntentId: string }>(req);
    if (!body) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { paymentIntentId } = body;
    if (!paymentIntentId) {
      return NextResponse.json({ error: 'Missing paymentIntentId' }, { status: 400 });
    }

    if (typeof paymentIntentId !== 'string' || !/^pi_[a-zA-Z0-9]+$/.test(paymentIntentId)) {
      return NextResponse.json({ error: 'Invalid paymentIntentId format' }, { status: 400 });
    }

    const intent = await stripe.paymentIntents.cancel(paymentIntentId);
    return NextResponse.json({ success: true, status: intent.status });
  } catch (error: unknown) {
    console.error('Stripe cancel error:', error);
    return serverError('Unable to cancel payment intent');
  }
}
