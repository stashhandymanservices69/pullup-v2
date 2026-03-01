/**
 * FULL FIRESTORE CLEANUP — Pre-Launch Reset
 * Deletes ALL cafes (except platform admin), ALL orders, ALL affiliates,
 * ALL affiliate_commissions, ALL support_tickets.
 * Firebase Auth accounts are NOT touched — master login preserved.
 */
import { readFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envContent = readFileSync(resolve(__dirname, '../.env.local'), 'utf-8');
for (const line of envContent.split('\n')) {
  const t = line.trim();
  if (!t || t.startsWith('#')) continue;
  const eq = t.indexOf('=');
  if (eq < 1) continue;
  const k = t.slice(0, eq).trim();
  let v = t.slice(eq + 1).trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
  if (!process.env[k]) process.env[k] = v;
}

const admin = (await import('firebase-admin')).default;
let pk = process.env.FIREBASE_PRIVATE_KEY || '';
if (pk.includes('\\n')) pk = pk.replace(/\\n/g, '\n');
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: pk,
    }),
  });
}
const db = admin.firestore();

async function deleteCollection(name, filterFn) {
  const snap = await db.collection(name).get();
  let deleted = 0;
  let skipped = 0;
  for (const d of snap.docs) {
    if (filterFn && !filterFn(d)) {
      skipped++;
      continue;
    }
    // Delete subcollections first (e.g. cafes/{id}/menu)
    const subcols = await d.ref.listCollections();
    for (const sub of subcols) {
      const subSnap = await sub.get();
      for (const sd of subSnap.docs) await sd.ref.delete();
    }
    await d.ref.delete();
    deleted++;
  }
  return { deleted, skipped, total: snap.size };
}

console.log('=== FULL FIRESTORE CLEANUP — Pre-Launch Reset ===\n');

// 1. Delete ALL cafes EXCEPT platform admin
const cafesResult = await deleteCollection('cafes', (doc) => {
  const data = doc.data();
  const isAdmin = data.isPlatformAdmin === true || data.role === 'platform_admin';
  if (isAdmin) {
    console.log(`  ✓ KEPT admin cafe: ${doc.id} (${data.cafeName || data.email || 'unknown'})`);
  }
  return !isAdmin; // delete if NOT admin
});
console.log(`cafes: ${cafesResult.deleted} deleted, ${cafesResult.skipped} kept (admin)`);

// 2. Delete ALL orders
const ordersResult = await deleteCollection('orders');
console.log(`orders: ${ordersResult.deleted} deleted`);

// 3. Delete ALL affiliates
const affResult = await deleteCollection('affiliates');
console.log(`affiliates: ${affResult.deleted} deleted`);

// 4. Delete ALL affiliate commissions
const commResult = await deleteCollection('affiliate_commissions');
console.log(`affiliate_commissions: ${commResult.deleted} deleted`);

// 5. Delete ALL support tickets
const ticketResult = await deleteCollection('support_tickets');
console.log(`support_tickets: ${ticketResult.deleted} deleted`);

console.log('\n=== CLEANUP COMPLETE ===');
console.log('Firebase Auth accounts untouched — master login preserved.');
console.log('Lock screen remains active via ACCESS_LOCK_CODE env var.');
process.exit(0);
