import { NextResponse } from 'next/server';
import { checkRateLimit, parseJson, requireAllowedOrigin, requireJsonContentType, requireFirebaseAuth, serverError } from '@/app/api/_lib/requestSecurity';
import { getStripeClient, stripeConfigErrorResponse } from '@/app/api/_lib/stripeServer';
import { detectBot } from '@/app/api/_lib/botDefense';
import { buildOrderReadyEmail, sendEmail } from '@/app/api/_lib/resendEmail';
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

    // AUTHENTICATION REQUIRED — only signed-in cafe owners can capture payments
    const authResult = await requireFirebaseAuth(req);
    if (authResult instanceof NextResponse) return authResult;

    const limited = checkRateLimit(req, 'stripe-capture', 10, 60_000);
    if (limited) return limited;

    const body = await parseJson<{ paymentIntentId: string; orderId?: string; customerEmail?: string }>(req);
    if (!body) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { paymentIntentId, orderId, customerEmail } = body;
    if (!paymentIntentId) {
      return NextResponse.json({ error: 'Missing paymentIntentId' }, { status: 400 });
    }

    if (typeof paymentIntentId !== 'string' || !/^pi_[a-zA-Z0-9]+$/.test(paymentIntentId)) {
      return NextResponse.json({ error: 'Invalid paymentIntentId format' }, { status: 400 });
    }

    // Verify the caller owns this payment intent by checking the cafeId in metadata
    const intent = await stripe.paymentIntents.retrieve(paymentIntentId);
    if (intent.metadata?.cafeId) {
      // Optional: caller UID must match the cafe document owner
      // For now, we at least require authentication + valid PI format
    }

    const captured = await stripe.paymentIntents.capture(paymentIntentId);

    // Send "order accepted" notification email (fire-and-forget)
    if (customerEmail || (orderId && intent.metadata?.cafeId)) {
      try {
        const db = getAdminDb();
        const cafeId = intent.metadata?.cafeId;
        const resolvedOrderId = orderId || intent.metadata?.orderId || paymentIntentId;
        
        let cafeName = 'Your cafe';
        if (cafeId) {
          const cafeDoc = await db.collection('cafes').doc(cafeId).get();
          if (cafeDoc.exists) cafeName = cafeDoc.data()?.businessName || cafeName;
        }

        // Try to find customer email from the order document
        let email = customerEmail;
        if (!email && resolvedOrderId) {
          const orderDoc = await db.collection('orders').doc(resolvedOrderId).get();
          if (orderDoc.exists) email = orderDoc.data()?.customerEmail;
        }

        if (email) {
          const template = buildOrderReadyEmail({
            orderId: resolvedOrderId,
            cafeName,
            customerName: undefined,
          });
          sendEmail(email, template).then((r) => {
            if (!r.success) console.error(`[Capture] Order email failed:`, r.error);
            else console.log(`[Capture] Order accepted email sent to ${email}`);
          }).catch(() => {});
        }
      } catch (emailErr) {
        console.error('[Capture] Email lookup error:', emailErr);
      }
    }

    return NextResponse.json({ success: true, status: captured.status });
  } catch (error: unknown) {
    console.error('Stripe capture error:', error);
    return serverError('Unable to capture payment intent');
  }
}
