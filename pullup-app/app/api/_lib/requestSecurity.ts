import { NextResponse } from 'next/server';

type RateEntry = {
  count: number;
  resetAt: number;
};

const rateLimitMap = new Map<string, RateEntry>();

const getAllowedOrigins = () => {
  const configured = process.env.ALLOWED_ORIGINS;
  if (configured && configured.trim()) {
    return configured
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean);
  }

  if (process.env.NODE_ENV === 'production') {
    return [];
  }

  return ['http://localhost:3000', 'http://127.0.0.1:3000'];
};

export const requireAllowedOrigin = (req: Request) => {
  const origin = req.headers.get('origin');
  const allowedOrigins = getAllowedOrigins();

  if (!origin || !allowedOrigins.includes(origin)) {
    return NextResponse.json({ error: 'Origin not allowed' }, { status: 403 });
  }

  return null;
};

export const requireJsonContentType = (req: Request) => {
  const contentType = req.headers.get('content-type') || '';
  if (!contentType.toLowerCase().includes('application/json')) {
    return NextResponse.json({ error: 'Content-Type must be application/json' }, { status: 415 });
  }

  return null;
};

const getClientIp = (req: Request) => {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0]?.trim() || 'unknown';
  }

  return req.headers.get('x-real-ip') || 'unknown';
};

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
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }

  entry.count += 1;
  rateLimitMap.set(key, entry);
  return null;
};

export const parseJson = async <T>(req: Request) => {
  try {
    return (await req.json()) as T;
  } catch {
    return null;
  }
};

export const serverError = (fallback = 'Internal server error') => {
  return NextResponse.json(
    { error: process.env.NODE_ENV === 'production' ? fallback : `Internal server error: ${fallback}` },
    { status: 500 },
  );
};
