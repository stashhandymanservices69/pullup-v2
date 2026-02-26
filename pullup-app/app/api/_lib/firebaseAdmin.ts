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
  const json = process.env.FIREBASE_ADMIN_SDK_JSON;
  const base64 = process.env.FIREBASE_ADMIN_SDK_BASE64;
  let parsed: ServiceAccount;

  if (json) {
    parsed = JSON.parse(json) as ServiceAccount;
  } else if (base64) {
    const decoded = Buffer.from(base64, 'base64').toString('utf8');
    parsed = JSON.parse(decoded) as ServiceAccount;
  } else {
    throw new Error('Missing FIREBASE_ADMIN_SDK_JSON or FIREBASE_ADMIN_SDK_BASE64');
  }

  if (!parsed.project_id || !parsed.client_email || !parsed.private_key) {
    throw new Error('Invalid Firebase service account: missing project_id, client_email, or private_key');
  }

  return {
    projectId: parsed.project_id,
    clientEmail: parsed.client_email,
    privateKey: parsed.private_key,
  };
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
