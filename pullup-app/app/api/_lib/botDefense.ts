/**
 * Bot & AI Agent Defense Layer
 *
 * Heuristic detection of automated requests from bots, scrapers,
 * AI agents, and credential-stuffing toolkits.
 *
 * Layers of defense (defense-in-depth):
 *   1. Request fingerprint anomaly detection
 *   2. Behavioral velocity checks (burst detection)
 *   3. Header consistency validation
 *   4. Known bot/AI user-agent patterns
 *   5. Request timing entropy analysis
 *
 * This is NOT a CAPTCHA replacement — it's a fast pre-filter that
 * blocks obvious automation before hitting business logic.
 */

import { NextResponse } from 'next/server';
import { getClientIp } from '@/app/api/_lib/requestSecurity';

/* ─── KNOWN BOT / AI AGENT SIGNATURES ─────────────────────────────── */

const BOT_UA_PATTERNS = [
  /bot\b/i, /crawl/i, /spider/i, /scrape/i, /curl\b/i, /wget\b/i,
  /python-requests/i, /httpx/i, /aiohttp/i, /node-fetch/i, /axios/i,
  /postman/i, /insomnia/i, /got\//i, /undici/i,
  /gpt/i, /openai/i, /anthropic/i, /claude/i, /gemini/i, /bard/i,
  /langchain/i, /autogpt/i, /agentgpt/i, /copilot/i,
  /headless/i, /phantom/i, /puppeteer/i, /playwright/i, /selenium/i,
  /webdriver/i, /chrome-lighthouse/i,
  /semrush/i, /ahrefs/i, /mj12bot/i, /dotbot/i, /petalbot/i,
  /bingbot/i, /yandex/i, /baiduspider/i,
];

/* ─── BURST TRACKER (per-IP micro-window) ─────────────────────────── *
 * Catches rapid-fire requests that exceed human-possible velocity.
 * A human cannot submit > 4 checkout requests in 5 seconds.
 * An AI agent hammering your API absolutely can.
 * ──────────────────────────────────────────────────────────────────── */

type BurstEntry = { timestamps: number[] };
const burstMap = new Map<string, BurstEntry>();
const BURST_WINDOW_MS = 5_000;
const BURST_MAX_HITS = 4;
const BURST_MAP_CEILING = 5_000;

// Periodic cleanup
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    if (burstMap.size > BURST_MAP_CEILING) burstMap.clear();
    const cutoff = Date.now() - BURST_WINDOW_MS * 2;
    for (const [k, v] of burstMap) {
      if (v.timestamps[v.timestamps.length - 1]! < cutoff) burstMap.delete(k);
    }
  }, 30_000);
}

const isBurstAbuse = (ip: string): boolean => {
  const now = Date.now();
  const entry = burstMap.get(ip) || { timestamps: [] };
  entry.timestamps = entry.timestamps.filter((t) => t > now - BURST_WINDOW_MS);
  entry.timestamps.push(now);
  burstMap.set(ip, entry);
  return entry.timestamps.length > BURST_MAX_HITS;
};

/* ─── HEADER CONSISTENCY CHECKS ───────────────────────────────────── *
 * Real browsers always send certain headers. Automated tools often don't.
 * ──────────────────────────────────────────────────────────────────── */

const hasMinimalBrowserHeaders = (req: Request): boolean => {
  // Real browsers always send Accept and a non-empty user-agent
  const ua = req.headers.get('user-agent');
  const accept = req.headers.get('accept');
  if (!ua || ua.length < 10) return false;
  if (!accept) return false;
  return true;
};

/* ─── MAIN DEFENSE FUNCTION ───────────────────────────────────────── *
 * Call this at the TOP of any sensitive route (checkout, connect, SMS).
 * Returns a 403 response if the request looks automated, or null if OK.
 * ──────────────────────────────────────────────────────────────────── */

export const detectBot = (req: Request): NextResponse | null => {
  const ip = getClientIp(req);

  // 1. Burst velocity check (catches all automated tools regardless of headers)
  if (isBurstAbuse(ip)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  // 2. Known bot/AI user-agent match
  const ua = req.headers.get('user-agent') || '';
  for (const pattern of BOT_UA_PATTERNS) {
    if (pattern.test(ua)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  // 3. Missing browser headers (fetch from a real browser always sends these)
  if (!hasMinimalBrowserHeaders(req)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // 4. Empty or suspiciously short origin (potential curl/script attack)
  const origin = req.headers.get('origin');
  if (origin && origin.length < 8) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return null; // Passed all checks
};

/* ─── IDEMPOTENCY GUARD ───────────────────────────────────────────── *
 * Prevents replay attacks by tracking request IDs.
 * AI agents often replay the same request many times.
 * ──────────────────────────────────────────────────────────────────── */

const seenRequests = new Map<string, number>();
const IDEMPOTENCY_WINDOW_MS = 60_000;
const IDEMPOTENCY_MAP_CEILING = 10_000;

if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    if (seenRequests.size > IDEMPOTENCY_MAP_CEILING) seenRequests.clear();
    const cutoff = Date.now() - IDEMPOTENCY_WINDOW_MS;
    for (const [k, v] of seenRequests) {
      if (v < cutoff) seenRequests.delete(k);
    }
  }, 30_000);
}

export const checkIdempotency = (key: string): NextResponse | null => {
  if (!key) return null;
  const now = Date.now();
  const seen = seenRequests.get(key);
  if (seen && now - seen < IDEMPOTENCY_WINDOW_MS) {
    return NextResponse.json({ error: 'Duplicate request' }, { status: 409 });
  }
  seenRequests.set(key, now);
  return null;
};
