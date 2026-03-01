import { NextResponse } from 'next/server';
import { ACCESS_COOKIE_NAME, ACCESS_TTL_SECONDS, createAccessToken, isAccessCodeValid } from '../../../../lib/accessLock';
import { checkRateLimit, getClientIp, parseJson, requireAllowedOrigin, requireJsonContentType, serverError } from '@/app/api/_lib/requestSecurity';
import { logSecurityEvent } from '@/app/api/analytics/security/route';

export async function POST(request: Request) {
    try {
        const originCheck = requireAllowedOrigin(request);
        if (originCheck) return originCheck;

        const contentTypeCheck = requireJsonContentType(request);
        if (contentTypeCheck) return contentTypeCheck;

        const limited = checkRateLimit(request, 'access-unlock', 10, 60_000);
        if (limited) {
            await logSecurityEvent({
                type: 'rate_limited',
                ip: getClientIp(request),
                country: request.headers.get('x-vercel-ip-country') || 'Unknown',
                userAgent: request.headers.get('user-agent') || '',
                path: '/api/access/unlock',
                details: 'Rate limit exceeded on access code attempts',
                severity: 'high',
            });
            return limited;
        }

        const body = await parseJson<{ code: string }>(request);
        if (!body) {
            return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
        }

        const code = typeof body?.code === 'string' ? body.code : '';

        if (!isAccessCodeValid(code)) {
            // Log failed access code attempt
            await logSecurityEvent({
                type: 'failed_access_code',
                ip: getClientIp(request),
                country: request.headers.get('x-vercel-ip-country') || 'Unknown',
                userAgent: request.headers.get('user-agent') || '',
                path: '/api/access/unlock',
                details: `Invalid access code attempt (length: ${code.length})`,
                severity: 'medium',
            });
            return NextResponse.json({ error: 'Invalid access code' }, { status: 401 });
        }

        const token = await createAccessToken();
        const response = NextResponse.json({ ok: true });
        response.cookies.set(ACCESS_COOKIE_NAME, token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            path: '/',
            maxAge: ACCESS_TTL_SECONDS,
        });

        return response;
    } catch {
        return serverError('Unable to process unlock request');
    }
}
