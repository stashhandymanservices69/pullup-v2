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
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert({ projectId: process.env.FIREBASE_PROJECT_ID, clientEmail: process.env.FIREBASE_CLIENT_EMAIL, privateKey: pk }) });
const db = admin.firestore();

const doc = await db.collection('cafes').doc('test-cafe-steven-sim').get();
const data = doc.data();
console.log('Cafe affiliateId:', data?.affiliateId);
console.log('Cafe affiliateWindowEnd:', data?.affiliateWindowEnd);
console.log('Cafe referredBy:', data?.referredBy);

const affSnap = await db.collection('affiliates').where('referralCode', '==', 'PULLUP-ASHLEY-SIM1').get();
console.log('Affiliates with code PULLUP-ASHLEY-SIM1:', affSnap.size);
if (!affSnap.empty) {
  console.log('Affiliate ID:', affSnap.docs[0].id);
  console.log('Affiliate data:', JSON.stringify(affSnap.docs[0].data(), null, 2));
}

process.exit(0);
