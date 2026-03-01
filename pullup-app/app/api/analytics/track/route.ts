import { NextResponse } from 'next/server';
import { getAdminDb } from '@/app/api/_lib/firebaseAdmin';

/**
 * Analytics Beacon Receiver
 * 
 * Lightweight endpoint that receives page view events from the client-side
 * analytics beacon and stores them in Firestore `site_analytics` collection.
 * 
 * Captures: path, referrer, user agent, screen size, country, device type,
 * browser, OS, session fingerprint, timestamp, and page view sequence.
 * 
 * Rate limited: 30 requests per 60 seconds per IP to prevent abuse.
 * No authentication required (tracks all visitors including anonymous).
 */

// Simple in-memory rate limiter for analytics
const analyticsRateMap = new Map<string, { count: number; resetAt: number }>();
const ANALYTICS_RATE_LIMIT = 30;
const ANALYTICS_RATE_WINDOW = 60_000;

if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    if (analyticsRateMap.size > 5000) analyticsRateMap.clear();
    const now = Date.now();
    for (const [k, v] of analyticsRateMap) {
      if (v.resetAt <= now) analyticsRateMap.delete(k);
    }
  }, 60_000);
}

// Parse user agent into device/browser/OS
function parseUA(ua: string) {
  const device = /mobile|android|iphone|ipad|tablet/i.test(ua) ? 'Mobile' : 'Desktop';
  
  let browser = 'Other';
  if (/edg\//i.test(ua)) browser = 'Edge';
  else if (/opr\//i.test(ua) || /opera/i.test(ua)) browser = 'Opera';
  else if (/chrome/i.test(ua) && !/edg/i.test(ua)) browser = 'Chrome';
  else if (/safari/i.test(ua) && !/chrome/i.test(ua)) browser = 'Safari';
  else if (/firefox/i.test(ua)) browser = 'Firefox';
  
  let os = 'Other';
  if (/windows/i.test(ua)) os = 'Windows';
  else if (/mac os|macintosh/i.test(ua)) os = 'macOS';
  else if (/iphone|ipad/i.test(ua)) os = 'iOS';
  else if (/android/i.test(ua)) os = 'Android';
  else if (/linux/i.test(ua)) os = 'Linux';
  else if (/cros/i.test(ua)) os = 'Chrome OS';
  
  return { device, browser, os };
}

export async function POST(req: Request) {
  try {
    // Rate limit
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown';
    const now = Date.now();
    const entry = analyticsRateMap.get(ip);
    if (entry && entry.resetAt > now) {
      if (entry.count >= ANALYTICS_RATE_LIMIT) {
        return NextResponse.json({ ok: false }, { status: 429 });
      }
      entry.count++;
    } else {
      analyticsRateMap.set(ip, { count: 1, resetAt: now + ANALYTICS_RATE_WINDOW });
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    const ua = req.headers.get('user-agent') || '';
    const { device, browser, os } = parseUA(ua);
    
    // Country detection — Vercel provides this header automatically
    const country = req.headers.get('x-vercel-ip-country') || body.country || 'Unknown';
    const city = req.headers.get('x-vercel-ip-city') || '';
    const region = req.headers.get('x-vercel-ip-country-region') || '';

    const db = getAdminDb();
    await db.collection('site_analytics').add({
      // Page data
      path: String(body.path || '/').slice(0, 200),
      view: String(body.view || 'landing').slice(0, 50),
      referrer: String(body.referrer || '').slice(0, 500),
      
      // Session
      sessionId: String(body.sessionId || '').slice(0, 64),
      pageInSession: Number(body.pageInSession) || 1,
      
      // Screen
      screenWidth: Number(body.screenWidth) || 0,
      screenHeight: Number(body.screenHeight) || 0,
      
      // Parsed data
      device,
      browser,
      os,
      userAgent: ua.slice(0, 300),
      
      // Geo (from Vercel headers)
      country,
      city: decodeURIComponent(city),
      region,
      ip: ip.slice(0, 45), // IPv6 max
      
      // Timing
      timestamp: new Date().toISOString(),
      loadTime: Number(body.loadTime) || 0,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[Analytics] Track error:', err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
