import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { admin, getAdminDb } from '@/app/api/_lib/firebaseAdmin';
import { requireAdmin } from '@/app/api/_lib/adminAuth';
import { parseJson, requireJsonContentType, serverError } from '@/app/api/_lib/requestSecurity';
import { buildApprovalEmail, sendEmail } from '@/app/api/_lib/resendEmail';
import { sendApprovalSms } from './smsHelper';

export async function POST(req: NextRequest) {
  const auth = requireAdmin(req);
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

    await adminDb.collection('cafes').doc(cafeId).update({
      isApproved: true,
      status: 'open',
      approvedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Fire-and-forget: send approval email + SMS (don't block the response)
    const notifications: Promise<unknown>[] = [];

    if (cafe.email) {
      const template = buildApprovalEmail(cafe.businessName || 'Cafe', cafe.email);
      notifications.push(
        sendEmail(cafe.email, template).then((r) => {
          if (!r.success) console.error(`[Approve] Email failed for ${cafeId}:`, r.error);
          else console.log(`[Approve] Email sent to ${cafe.email} (id: ${r.id})`);
        }),
      );
    }

    if (cafe.phone) {
      notifications.push(
        sendApprovalSms(cafe.phone, cafe.businessName || 'Your business').then((r) => {
          if (!r.success) console.error(`[Approve] SMS failed for ${cafeId}:`, r.error);
          else console.log(`[Approve] SMS sent to ${cafe.phone} (sid: ${r.sid})`);
        }),
      );
    }

    // Wait for notifications but don't fail the approval if they error
    await Promise.allSettled(notifications);

    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    console.error('Admin cafe approve error:', error);
    return serverError('Unable to approve cafe');
  }
}
