import { NextResponse } from 'next/server';
import { getAdminDb } from '@/app/api/_lib/firebaseAdmin';

/**
 * Security Event Logger
 * 
 * Records security-relevant events to Firestore `security_events` collection.
 * Called from other API routes and client when suspicious activity is detected.
 * 
 * Event types:
 * - failed_access_code: Wrong access code attempts
 * - failed_pulse_login: Failed P.U.L.S.E. admin login
 * - bot_blocked: Bot/scraper detected and blocked
 * - rate_limited: IP hit rate limit threshold
 * - api_probe: Unauthorized API access attempt
 * - suspicious_origin: Request from unauthorized origin
 * 
 * This can also be called directly as a utility from server-side:
 * import { logSecurityEvent } from './route';
 */

// Helper function for server-side direct logging (no HTTP overhead)
export async function logSecurityEvent(event: {
  type: string;
  ip?: string;
  country?: string;
  userAgent?: string;
  path?: string;
  details?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
}) {
  try {
    const db = getAdminDb();
    await db.collection('security_events').add({
      type: event.type,
      ip: event.ip || 'unknown',
      country: event.country || 'Unknown',
      userAgent: (event.userAgent || '').slice(0, 300),
      path: event.path || '',
      details: event.details || '',
      severity: event.severity || 'medium',
      timestamp: new Date().toISOString(),
      reviewed: false,
    });
  } catch (err) {
    console.error('[Security] Failed to log event:', err);
  }
}

// Rate limit for the HTTP endpoint itself
const secRateMap = new Map<string, { count: number; resetAt: number }>();

export async function POST(req: Request) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown';
    const now = Date.now();
    const entry = secRateMap.get(ip);
    if (entry && entry.resetAt > now) {
      if (entry.count >= 10) return NextResponse.json({ ok: false }, { status: 429 });
      entry.count++;
    } else {
      secRateMap.set(ip, { count: 1, resetAt: now + 60_000 });
    }

    // Cleanup
    if (secRateMap.size > 2000) {
      for (const [k, v] of secRateMap) {
        if (v.resetAt <= now) secRateMap.delete(k);
      }
    }

    const body = await req.json().catch(() => null);
    if (!body || !body.type) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    const ua = req.headers.get('user-agent') || '';
    const country = req.headers.get('x-vercel-ip-country') || 'Unknown';

    await logSecurityEvent({
      type: String(body.type).slice(0, 50),
      ip,
      country,
      userAgent: ua,
      path: String(body.path || '').slice(0, 200),
      details: String(body.details || '').slice(0, 500),
      severity: ['low', 'medium', 'high', 'critical'].includes(body.severity) ? body.severity : 'medium',
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[Security] Event route error:', err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
