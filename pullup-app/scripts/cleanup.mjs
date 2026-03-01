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

await db.collection('cafes').doc('test-cafe-steven-sim').delete().catch(()=>{});
const ordersSnap = await db.collection('orders').where('isSimulation', '==', true).get();
for (const d of ordersSnap.docs) await d.ref.delete();
const commSnap = await db.collection('affiliate_commissions').where('cafeId', '==', 'test-cafe-steven-sim').get();
for (const d of commSnap.docs) await d.ref.delete();
const affSnap = await db.collection('affiliates').where('email', '==', 'ashclairemurray@gmail.com').get();
for (const d of affSnap.docs) await d.ref.delete();
const menuSnap = await db.collection('cafes').doc('test-cafe-steven-sim').collection('menu').get();
for (const d of menuSnap.docs) await d.ref.delete();
console.log(`Cleanup: ${ordersSnap.size} orders, ${commSnap.size} commissions, ${affSnap.size} affiliates deleted`);
process.exit(0);
