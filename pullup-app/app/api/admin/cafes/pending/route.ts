import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getAdminDb } from '@/app/api/_lib/firebaseAdmin';
import { requireAdmin } from '@/app/api/_lib/adminAuth';
import { serverError } from '@/app/api/_lib/requestSecurity';

export async function GET(req: NextRequest) {
  const auth = requireAdmin(req);
  if (auth) return auth;

  try {
    const adminDb = getAdminDb();
    const snapshot = await adminDb.collection('cafes').where('isApproved', '==', false).get();
    const cafes = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    return NextResponse.json({ cafes });
  } catch (error: unknown) {
    console.error('Admin cafes pending error:', error);
    return serverError('Unable to load pending cafes');
  }
}
