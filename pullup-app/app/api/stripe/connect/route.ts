import { NextResponse } from 'next/server';
import { checkRateLimit, isValidCafeId, parseJson, requireAllowedOrigin, requireJsonContentType, requireFirebaseAuth, serverError } from '@/app/api/_lib/requestSecurity';
import { getStripeClient, stripeConfigErrorResponse } from '@/app/api/_lib/stripeServer';
import { detectBot } from '@/app/api/_lib/botDefense';

// Lazy-load Firebase Admin to avoid crashing if credentials have issues
let _adminDb: any = null;
const getDb = () => {
  if (_adminDb) return _adminDb;
  try {
    const { getAdminDb } = require('@/app/api/_lib/firebaseAdmin');
    _adminDb = getAdminDb();
    return _adminDb;
  } catch (e) {
    console.error('Firebase Admin init failed in connect route:', e);
    return null;
  }
};

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

    const firebaseUid = cafeId || authResult.uid;

    // Try to check for existing Stripe account in Firestore (non-blocking if Firestore fails)
    let existingStripeId: string | null = null;
    const adminDb = getDb();
    if (adminDb) {
      try {
        const cafeDoc = await adminDb.collection('cafes').doc(firebaseUid).get();
        existingStripeId = cafeDoc.exists ? cafeDoc.data()?.stripeAccountId || null : null;
      } catch (e) {
        console.error('Firestore read failed, will create new account:', e);
      }
    }

    let accountId: string;

    if (existingStripeId && typeof existingStripeId === 'string' && existingStripeId.startsWith('acct_')) {
      // Reuse existing account — just create a new onboarding link
      accountId = existingStripeId;
    } else {
      // Create a new Stripe Express account for the Cafe
      const account = await stripe.accounts.create({
        type: 'express',
        email,
        business_profile: { name: typeof businessName === 'string' ? businessName.slice(0, 128) : 'Cafe Partner' },
        metadata: { 
          referred_by: typeof referralCode === 'string' ? referralCode.slice(0, 64) : 'organic_signup',
          firebase_uid: firebaseUid,
        } 
      });
      accountId = account.id;

      // Save stripeAccountId to Firestore (non-blocking — don't crash if this fails)
      if (adminDb) {
        try {
          await adminDb.collection('cafes').doc(firebaseUid).set(
            { stripeAccountId: accountId, stripeConnected: false },
            { merge: true }
          );
        } catch (e) {
          console.error('Failed to save stripeAccountId to Firestore:', e);
        }
      }
    }

    const origin = req.headers.get('origin') as string;
    
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${origin}/?stripe_return=refresh&acct=${accountId}`,
      return_url: `${origin}/?stripe_return=complete&acct=${accountId}`,
      type: 'account_onboarding',
    });

    return NextResponse.json({ url: accountLink.url, accountId });

  } catch (error: unknown) {
    console.error('Stripe connect error:', error);
    // Return specific Stripe error details so we can debug
    const stripeErr = error as { type?: string; message?: string; code?: string; statusCode?: number; raw?: { message?: string } };
    const detail = stripeErr?.message || stripeErr?.raw?.message || 'Unknown error';
    const code = stripeErr?.code || stripeErr?.type || 'unknown';
    return NextResponse.json(
      { error: `Stripe Connect failed: ${detail}`, code },
      { status: stripeErr?.statusCode || 500 }
    );
  }
}
