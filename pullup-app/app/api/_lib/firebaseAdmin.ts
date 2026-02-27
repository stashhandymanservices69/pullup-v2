import admin from 'firebase-admin';
import type { ServiceAccount as FirebaseServiceAccount } from 'firebase-admin/app';
import type { App } from 'firebase-admin/app';
import type { Firestore } from 'firebase-admin/firestore';

type ServiceAccount = {
  project_id?: string;
  client_email?: string;
  private_key?: string;
};

const getServiceAccount = (): FirebaseServiceAccount => {
  // Strategy 1: Full JSON blob (FIREBASE_ADMIN_SDK_JSON)
  const json = process.env.FIREBASE_ADMIN_SDK_JSON;
  if (json) {
    const parsed = JSON.parse(json) as ServiceAccount;
    if (parsed.project_id && parsed.client_email && parsed.private_key) {
      return { projectId: parsed.project_id, clientEmail: parsed.client_email, privateKey: parsed.private_key };
    }
  }

  // Strategy 2: Base64-encoded JSON (FIREBASE_ADMIN_SDK_BASE64)
  const base64 = process.env.FIREBASE_ADMIN_SDK_BASE64;
  if (base64) {
    const decoded = Buffer.from(base64, 'base64').toString('utf8');
    const parsed = JSON.parse(decoded) as ServiceAccount;
    if (parsed.project_id && parsed.client_email && parsed.private_key) {
      return { projectId: parsed.project_id, clientEmail: parsed.client_email, privateKey: parsed.private_key };
    }
  }

  // Strategy 3: Individual env vars (FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY)
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (projectId && clientEmail && privateKey) {
    // Vercel/env files sometimes escape newlines as literal \n — fix them
    if (privateKey.includes('\\n')) {
      privateKey = privateKey.replace(/\\n/g, '\n');
    }
    return { projectId, clientEmail, privateKey };
  }

  throw new Error(
    'Missing Firebase Admin credentials. Set one of: ' +
    'FIREBASE_ADMIN_SDK_JSON, FIREBASE_ADMIN_SDK_BASE64, or ' +
    'individual FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY'
  );
};

let cachedApp: App | null = null;
let cachedDb: Firestore | null = null;

const getAdminApp = (): App => {
  if (cachedApp) return cachedApp;

  cachedApp = admin.apps.length
    ? admin.app()
    : admin.initializeApp({
        credential: admin.credential.cert(getServiceAccount()),
      });

  return cachedApp;
};

const getAdminDb = (): Firestore => {
  if (cachedDb) return cachedDb;
  cachedDb = admin.firestore(getAdminApp());
  return cachedDb;
};

export { admin, getAdminApp, getAdminDb };
