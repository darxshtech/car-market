import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Admin routes protection
  if (pathname.startsWith('/admin')) {
    // Allow access to admin login page without authentication
    if (pathname === '/admin/login') {
      return NextResponse.next();
    }

    // Check for admin credentials
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPass = process.env.ADMIN_PASS;

    if (!adminEmail || !adminPass) {
      console.error('Admin credentials not configured');
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }

    // Get session token
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });

    // Check if user is authenticated and is admin
    if (!token || token.email !== adminEmail) {
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }

    // Validate session token is not expired (getToken handles this automatically)
    // If token is expired, getToken returns null and user is redirected above

    return NextResponse.next();
  }

  // Protected routes for authenticated users
  if (pathname.startsWith('/sell-car') || pathname.startsWith('/my-garage')) {
    // Validate session token
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });

    // Handle unauthenticated users (including expired sessions)
    if (!token) {
      return NextResponse.redirect(new URL('/signin', request.url));
    }

    // Check if profile is complete
    if (!token.profileComplete) {
      return NextResponse.redirect(new URL('/complete-profile', request.url));
    }

    // Check banned status from session token
    // Check banned status from token
    // Note: Real-time ban enforcement happens at the API level
    // The token is updated when user signs in or session is refreshed
    if (token.banned) {
      return NextResponse.redirect(new URL('/?error=banned', request.url));
    }

    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/sell-car/:path*', '/my-garage/:path*'],
};
