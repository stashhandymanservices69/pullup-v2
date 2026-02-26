import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { admin, getAdminDb } from '@/app/api/_lib/firebaseAdmin';
import { requireAdmin } from '@/app/api/_lib/adminAuth';
import { parseJson, requireJsonContentType, serverError } from '@/app/api/_lib/requestSecurity';

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
    await adminDb.collection('cafes').doc(cafeId).update({
      isApproved: true,
      status: 'open',
      approvedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    console.error('Admin cafe approve error:', error);
    return serverError('Unable to approve cafe');
  }
}
