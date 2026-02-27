import { NextRequest, NextResponse } from 'next/server';

const ACCESS_COOKIE_NAME = 'pullup_launch_access';

/**
 * Middleware that enforces the access-lock gate.
 *
 * Every page request (excluding the /access page itself, API routes, Next
 * internals, and static assets) is checked for a valid access cookie.
 * If the cookie is missing the visitor is redirected to /access?next=<original path>.
 *
 * NOTE: Full HMAC verification of the token is not possible in Edge middleware
 * because the signing secret lives only on the server.  The middleware therefore
 * performs a lightweight structural check (presence + not-expired).  The API
 * routes still perform full cryptographic verification on every authenticated
 * request.
 */
export function proxy(request: NextRequest) {
    const token = request.cookies.get(ACCESS_COOKIE_NAME)?.value;

    if (!token) {
        return redirectToAccess(request);
    }

    // Lightweight structural validation (issuedAt.signature)
    const [issuedAtRaw, signature] = token.split('.');
    if (!issuedAtRaw || !signature) {
        return redirectToAccess(request);
    }

    const issuedAt = Number.parseInt(issuedAtRaw, 10);
    if (!Number.isFinite(issuedAt)) {
        return redirectToAccess(request);
    }

    const nowSeconds = Math.floor(Date.now() / 1000);
    const TTL_SECONDS = 60 * 60 * 3; // 3 hours – must match accessLock.ts

    // Token issued in the future (clock-skew tolerance: 5 min)
    if (issuedAt > nowSeconds + 300) {
        return redirectToAccess(request);
    }

    // Token expired
    if (nowSeconds - issuedAt > TTL_SECONDS) {
        return redirectToAccess(request);
    }

    return NextResponse.next();
}

function redirectToAccess(request: NextRequest) {
    const url = request.nextUrl.clone();
    const originalPath = url.pathname + url.search;
    url.pathname = '/access';
    url.search = originalPath !== '/' ? `?next=${encodeURIComponent(originalPath)}` : '';
    return NextResponse.redirect(url);
}

/**
 * Only run on page routes.  Exclude:
 *  - /access (the lock screen itself)
 *  - /api    (backend routes handle their own auth)
 *  - /_next  (Next.js internals / static chunks)
 *  - Static files by extension
 */
export const config = {
    matcher: [
        /*
         * Match all request paths EXCEPT:
         *  /access, /api, /_next, favicon, and common static extensions.
         */
        '/((?!access|api|_next|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff2?|ttf|eot|map)$).*)',
    ],
};
