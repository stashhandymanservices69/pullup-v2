import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { requireAllowedOrigin } from '@/app/api/_lib/requestSecurity';

type RateEntry = {
  count: number;
  resetAt: number;
};

const rateLimitMap = new Map<string, RateEntry>();
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 30;

const getClientIp = (req: NextRequest) => {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]?.trim() || 'unknown';
  return req.headers.get('x-real-ip') || 'unknown';
};

const rateLimit = (req: NextRequest) => {
  const ip = getClientIp(req);
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || entry.resetAt <= now) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return null;
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }

  entry.count += 1;
  rateLimitMap.set(ip, entry);
  return null;
};

export const requireAdmin = (req: NextRequest) => {
  const originCheck = requireAllowedOrigin(req);
  if (originCheck) return originCheck;

  const limited = rateLimit(req);
  if (limited) return limited;

  const adminToken = process.env.ADMIN_API_TOKEN;
  if (!adminToken) {
    return NextResponse.json({ error: 'Admin token not configured' }, { status: 500 });
  }

  const headerToken = req.headers.get('x-admin-token');
  const bearer = req.headers.get('authorization');
  const bearerToken = bearer?.startsWith('Bearer ') ? bearer.slice('Bearer '.length).trim() : null;
  const token = headerToken || bearerToken;

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const tokenBuffer = Buffer.from(token);
  const adminTokenBuffer = Buffer.from(adminToken);

  if (tokenBuffer.length !== adminTokenBuffer.length || !timingSafeEqual(tokenBuffer, adminTokenBuffer)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return null;
};
