import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { admin, getAdminDb } from '@/app/api/_lib/firebaseAdmin';
import { requireAdmin } from '@/app/api/_lib/adminAuth';
import { parseJson, requireJsonContentType, serverError, requireFirebaseAuth } from '@/app/api/_lib/requestSecurity';
import { buildApprovalEmail, sendEmail } from '@/app/api/_lib/resendEmail';
import { sendApprovalSms } from './smsHelper';

/**
 * Check if the request is authorized either via admin API token or via
 * Firebase auth where the user is a platform admin in Firestore.
 */
async function authorizeAdminOrPlatformAdmin(req: NextRequest): Promise<NextResponse | null> {
  // Try admin API token first
  const adminCheck = requireAdmin(req);
  if (!adminCheck) return null; // admin token is valid

  // Fallback: check Firebase auth + isPlatformAdmin flag
  const authResult = await requireFirebaseAuth(req);
  if (authResult instanceof NextResponse) {
    // Neither admin token nor Firebase auth worked
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Verify user is a platform admin
  const adminDb = getAdminDb();
  const userDoc = await adminDb.collection('cafes').doc(authResult.uid).get();
  if (!userDoc.exists) {
    return NextResponse.json({ error: 'Unauthorized: not a platform admin' }, { status: 403 });
  }
  const userData = userDoc.data();
  if (userData?.isPlatformAdmin !== true && userData?.role !== 'platform_admin') {
    return NextResponse.json({ error: 'Unauthorized: not a platform admin' }, { status: 403 });
  }

  return null; // authorized
}

export async function POST(req: NextRequest) {
  const auth = await authorizeAdminOrPlatformAdmin(req);
  if (auth) return auth;

  try {
    const contentTypeCheck = requireJsonContentType(req);
    if (contentTypeCheck) return contentTypeCheck;

    const body = await parseJson<{ cafeId: string }>(req);
    if (!body) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { cafeId } = body;
    if (!cafeId) {
      return NextResponse.json({ error: 'Missing cafeId' }, { status: 400 });
    }

    const adminDb = getAdminDb();

    // Fetch cafe profile for email + SMS details
    const cafeDoc = await adminDb.collection('cafes').doc(cafeId).get();
    if (!cafeDoc.exists) {
      return NextResponse.json({ error: 'Cafe not found' }, { status: 404 });
    }
    const cafe = cafeDoc.data() as { businessName?: string; email?: string; phone?: string };

    // Log full cafe data for debugging approval notifications
    console.log(`[Approve] Cafe ${cafeId} data:`, {
      businessName: cafe.businessName || '(none)',
      email: cafe.email || '(none)',
      phone: cafe.phone || '(none)',
    });

    // Set firstApprovedAt only on first-ever approval (anti-resignup affiliate guard)
    const cafeFullData = cafeDoc.data() as any;
    const updatePayload: any = {
      isApproved: true,
      status: 'open',
      approvedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    if (!cafeFullData.firstApprovedAt) {
      updatePayload.firstApprovedAt = new Date().toISOString();
    }

    await adminDb.collection('cafes').doc(cafeId).update(updatePayload);

    // Fire-and-forget: send approval email + SMS (don't block the response)
    const notifications: Promise<unknown>[] = [];
    const notificationResults: { email?: string; sms?: string } = {};

    if (cafe.email) {
      const template = buildApprovalEmail(cafe.businessName || 'Cafe', cafe.email);
      notifications.push(
        sendEmail(cafe.email, template).then((r) => {
          if (!r.success) {
            console.error(`[Approve] Email failed for ${cafeId}:`, r.error);
            notificationResults.email = `failed: ${r.error}`;
          } else {
            console.log(`[Approve] Email sent to ${cafe.email} (id: ${r.id}${r.simulated ? ' SIMULATED' : ''})`);
            notificationResults.email = r.simulated ? 'simulated' : `sent (${r.id})`;
          }
        }),
      );
    } else {
      console.warn(`[Approve] No email on file for cafe ${cafeId} — skipping approval email`);
      notificationResults.email = 'skipped: no email on file';
    }

    if (cafe.phone) {
      notifications.push(
        sendApprovalSms(cafe.phone, cafe.businessName || 'Your business').then((r) => {
          if (!r.success) {
            console.error(`[Approve] SMS failed for ${cafeId}:`, r.error);
            notificationResults.sms = `failed: ${r.error}`;
          } else {
            console.log(`[Approve] SMS sent to ${cafe.phone} (sid: ${r.sid}${r.simulated ? ' SIMULATED' : ''})`);
            notificationResults.sms = r.simulated ? 'simulated' : `sent (${r.sid})`;
          }
        }),
      );
    } else {
      console.warn(`[Approve] No phone on file for cafe ${cafeId} — skipping approval SMS`);
      notificationResults.sms = 'skipped: no phone on file';
    }

    // Wait for notifications but don't fail the approval if they error
    await Promise.allSettled(notifications);

    return NextResponse.json({ ok: true, notifications: notificationResults });
  } catch (error: unknown) {
    console.error('Admin cafe approve error:', error);
    return serverError('Unable to approve cafe');
  }
}
