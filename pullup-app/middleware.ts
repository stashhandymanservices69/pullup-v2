import { NextRequest, NextResponse } from 'next/server';
import { ACCESS_COOKIE_NAME, verifyAccessToken } from './lib/accessLock';

export async function middleware(request: NextRequest) {
    const { pathname, search } = request.nextUrl;
    const isApiRoute = pathname.startsWith('/api/');
    const isUnlockRoute = pathname === '/api/access/unlock';
    const cookieToken = request.cookies.get(ACCESS_COOKIE_NAME)?.value;
    const hasAccess = cookieToken ? await verifyAccessToken(cookieToken) : false;

    if (isApiRoute) {
        if (isUnlockRoute || hasAccess) {
            return NextResponse.next();
        }

        const response = NextResponse.json({ error: 'Access locked' }, { status: 401 });
        response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
        response.headers.set('Pragma', 'no-cache');
        response.headers.set('Expires', '0');
        return response;
    }

    if (pathname === '/access') {
        if (hasAccess) {
            const nextPath = request.nextUrl.searchParams.get('next');
            const target = nextPath && nextPath.startsWith('/') ? nextPath : '/';
            return NextResponse.redirect(new URL(target, request.url));
        }
        return NextResponse.next();
    }

    if (hasAccess) {
        return NextResponse.next();
    }

    const redirectUrl = new URL('/access', request.url);
    redirectUrl.searchParams.set('next', `${pathname}${search}`);
    const response = NextResponse.redirect(redirectUrl);
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    return response;
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|robots.txt|manifest.json|sitemap.xml|.*\\.(?:png|jpg|jpeg|svg|webp|gif|ico|txt|xml|css|js|map)$).*)',
    ],
};
