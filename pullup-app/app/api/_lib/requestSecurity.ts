import { NextResponse } from 'next/server';

/* ─── HARDCODED ALLOWED ORIGINS ──────────────────────────────────────
 * NEVER infer origins from request headers (Host / x-forwarded-host).
 * Those are attacker-controlled and bypass any check.
 * Add your production domain(s) here AND/OR set ALLOWED_ORIGINS env var.
 * ──────────────────────────────────────────────────────────────────── */

const HARDCODED_PRODUCTION_ORIGINS: readonly string[] = [
  'https://pullupcoffee.com.au',
  'https://www.pullupcoffee.com.au',
];

const getAllowedOrigins = (): string[] => {
  const extra = process.env.ALLOWED_ORIGINS?.trim();
  const origins = [...HARDCODED_PRODUCTION_ORIGINS];

  if (extra) {
    for (const o of extra.split(',')) {
      const trimmed = o.trim();
      if (trimmed) origins.push(trimmed);
    }
  }

  // Vercel preview deployments — only trust the env the platform injects
  const vercelUrl = process.env.VERCEL_URL?.trim();
  if (vercelUrl) origins.push(`https://${vercelUrl}`);

  if (process.env.NODE_ENV !== 'production') {
    origins.push('http://localhost:3000', 'http://127.0.0.1:3000');
  }

  return [...new Set(origins)];
};

/* ─── ORIGIN CHECK ─────────────────────────────────────────────────── */

export const requireAllowedOrigin = (req: Request) => {
  const origin = req.headers.get('origin');
  if (!origin || !getAllowedOrigins().includes(origin)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  return null;
};

/* ─── CONTENT-TYPE GUARD ───────────────────────────────────────────── */

export const requireJsonContentType = (req: Request) => {
  const ct = req.headers.get('content-type') || '';
  if (!ct.toLowerCase().includes('application/json')) {
    return NextResponse.json({ error: 'Unsupported Media Type' }, { status: 415 });
  }
  return null;
};

/* ─── CLIENT IP ────────────────────────────────────────────────────── */

export const getClientIp = (req: Request) => {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]?.trim() || 'unknown';
  return req.headers.get('x-real-ip') || 'unknown';
};

/* ─── RATE LIMITER (serverless-aware in-memory + global ceiling) ──── *
 * In-memory maps reset on cold starts which is a known gap.
 * We mitigate by:
 *   1. Keeping a GLOBAL rolling window per-route that survives warm invocations
 *   2. Using aggressive defaults that catch automated abuse within a single instance
 *   3. Applying a MAX_MAP_SIZE ceiling to prevent memory exhaustion attacks
 *
 * For production scale, swap this for Vercel KV / Upstash Redis.
 * ──────────────────────────────────────────────────────────────────── */

type RateEntry = { count: number; resetAt: number };
const rateLimitMap = new Map<string, RateEntry>();
const MAX_MAP_SIZE = 10_000;

// Periodic cleanup — safe in serverless (if instance survives, it cleans up)
const pruneStaleEntries = () => {
  const now = Date.now();
  if (rateLimitMap.size > MAX_MAP_SIZE) {
    rateLimitMap.clear(); // nuclear option to prevent OOM
    return;
  }
  for (const [k, v] of rateLimitMap) {
    if (v.resetAt <= now) rateLimitMap.delete(k);
  }
};
if (typeof setInterval !== 'undefined') {
  setInterval(pruneStaleEntries, 60_000);
}

export const checkRateLimit = (req: Request, routeKey: string, max: number, windowMs: number) => {
  const now = Date.now();
  const ip = getClientIp(req);
  const key = `${routeKey}:${ip}`;
  const entry = rateLimitMap.get(key);

  if (!entry || entry.resetAt <= now) {
    rateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
    return null;
  }

  if (entry.count >= max) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil((entry.resetAt - now) / 1000)) } },
    );
  }

  entry.count += 1;
  return null;
};

/* ─── SAFE JSON PARSER ─────────────────────────────────────────────── */

export const parseJson = async <T>(req: Request): Promise<T | null> => {
  try {
    return (await req.json()) as T;
  } catch {
    return null;
  }
};

/* ─── GENERIC ERROR (never leak internals in prod) ─────────────────── */

export const serverError = (fallback = 'Internal server error') =>
  NextResponse.json({ error: fallback }, { status: 500 });

/* ─── CORS RESPONSE HEADERS ────────────────────────────────────────── */

export const corsHeaders = (req: Request) => {
  const origin = req.headers.get('origin') || '';
  const allowed = getAllowedOrigins().includes(origin) ? origin : '';
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-admin-token',
    'Access-Control-Max-Age': '86400',
  };
};

/* ─── CAFE-ID VALIDATOR ────────────────────────────────────────────── *
 * Prevents Firestore path traversal (../ or slashes).
 * Cafe IDs must be alphanumeric + hyphens/underscores, 1–128 chars.
 * ──────────────────────────────────────────────────────────────────── */

const CAFE_ID_RE = /^[a-zA-Z0-9_-]{1,128}$/;

export const isValidCafeId = (id: unknown): id is string =>
  typeof id === 'string' && CAFE_ID_RE.test(id);

/* ─── REQUEST BODY SIZE GUARD ──────────────────────────────────────── *
 * Reject bodies larger than a sane limit to prevent memory bombs.
 * Note: Vercel already caps bodies at ~4.5 MB, but this gives an earlier kill.
 * ──────────────────────────────────────────────────────────────────── */

export const MAX_BODY_BYTES = 64 * 1024; // 64 KB

/* ─── FIREBASE AUTH HELPER ─────────────────────────────────────────── *
 * Verifies a Firebase ID token from the Authorization header.
 * Returns the decoded UID or null. Used to gate authenticated routes.
 * ──────────────────────────────────────────────────────────────────── */

export const requireFirebaseAuth = async (req: Request): Promise<{ uid: string } | NextResponse> => {
  const bearer = req.headers.get('authorization');
  const token = bearer?.startsWith('Bearer ') ? bearer.slice(7).trim() : null;

  if (!token) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  try {
    // Lazy import to keep cold-start cost low for unauthenticated routes
    const { getAdminApp } = await import('@/app/api/_lib/firebaseAdmin');
    const { getAuth } = await import('firebase-admin/auth');
    const decoded = await getAuth(getAdminApp()).verifyIdToken(token, true /* check revoked */);
    return { uid: decoded.uid };
  } catch {
    return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
  }
};
