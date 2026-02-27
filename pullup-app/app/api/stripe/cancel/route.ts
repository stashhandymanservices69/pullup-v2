import { NextResponse } from 'next/server';
import { checkRateLimit, parseJson, requireAllowedOrigin, requireJsonContentType, requireFirebaseAuth, serverError } from '@/app/api/_lib/requestSecurity';
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

    // AUTHENTICATION REQUIRED — only signed-in cafe owners can cancel payments
    const authResult = await requireFirebaseAuth(req);
    if (authResult instanceof NextResponse) return authResult;

    const limited = checkRateLimit(req, 'stripe-cancel', 10, 60_000);
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
