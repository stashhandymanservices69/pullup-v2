import { NextResponse } from 'next/server';
import { checkRateLimit, parseJson, requireAllowedOrigin, requireJsonContentType, requireFirebaseAuth, serverError } from '@/app/api/_lib/requestSecurity';
import { getStripeClient, stripeConfigErrorResponse } from '@/app/api/_lib/stripeServer';
import { detectBot } from '@/app/api/_lib/botDefense';
import { buildOrderDeclinedEmail, sendEmail } from '@/app/api/_lib/resendEmail';
import { getAdminDb } from '@/app/api/_lib/firebaseAdmin';

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

    const body = await parseJson<{ paymentIntentId: string; orderId?: string; reason?: string; customerEmail?: string }>(req);
    if (!body) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { paymentIntentId, orderId, reason, customerEmail } = body;
    if (!paymentIntentId) {
      return NextResponse.json({ error: 'Missing paymentIntentId' }, { status: 400 });
    }

    if (typeof paymentIntentId !== 'string' || !/^pi_[a-zA-Z0-9]+$/.test(paymentIntentId)) {
      return NextResponse.json({ error: 'Invalid paymentIntentId format' }, { status: 400 });
    }

    // Retrieve intent metadata before cancelling
    const intent = await stripe.paymentIntents.retrieve(paymentIntentId);
    const cancelledIntent = await stripe.paymentIntents.cancel(paymentIntentId);

    // Send "order declined" notification email (fire-and-forget)
    const cafeId = intent.metadata?.cafeId;
    const resolvedOrderId = orderId || intent.metadata?.orderId || paymentIntentId;

    try {
      const db = getAdminDb();
      let cafeName = 'the cafe';
      if (cafeId) {
        const cafeDoc = await db.collection('cafes').doc(cafeId).get();
        if (cafeDoc.exists) cafeName = cafeDoc.data()?.businessName || cafeName;
      }

      let email = customerEmail;
      if (!email && resolvedOrderId) {
        const orderDoc = await db.collection('orders').doc(resolvedOrderId).get();
        if (orderDoc.exists) email = orderDoc.data()?.customerEmail;
      }

      if (email) {
        const template = buildOrderDeclinedEmail({
          orderId: resolvedOrderId,
          cafeName,
          reason: typeof reason === 'string' ? reason.slice(0, 256) : undefined,
        });
        sendEmail(email, template).then((r) => {
          if (!r.success) console.error(`[Cancel] Declined email failed:`, r.error);
          else console.log(`[Cancel] Order declined email sent to ${email}`);
        }).catch(() => {});
      }
    } catch (emailErr) {
      console.error('[Cancel] Email lookup error:', emailErr);
    }

    return NextResponse.json({ success: true, status: cancelledIntent.status });
  } catch (error: unknown) {
    console.error('Stripe cancel error:', error);
    return serverError('Unable to cancel payment intent');
  }
}
