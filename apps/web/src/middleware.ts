/**
 * Next.js Middleware
 *
 * Route protection with JWT validation and role-based access control.
 * Runs on the edge runtime for fast authentication checks.
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

// Routes that don't require authentication
const publicPaths = ['/login', '/forgot-password', '/reset-password'];

// Role-based route access
const roleRoutes: Record<string, string[]> = {
  '/admin': ['SuperAdmin'],
  '/hr': ['SuperAdmin', 'HR'],
};

// Get dashboard route based on role
function getDashboardForRole(role: string): string {
  switch (role) {
    case 'SuperAdmin': return '/admin';
    case 'HR': return '/hr';
    default: return '/dashboard';
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip API routes, static files, and Next.js internals
  if (
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname.includes('.') // Static files (favicon.ico, images, etc.)
  ) {
    return NextResponse.next();
  }

  // Get access token from cookie
  const accessToken = request.cookies.get('access_token')?.value;

  // Check if path is public
  const isPublicPath = publicPaths.some(path => pathname.startsWith(path));

  // No token - redirect to login for protected routes
  if (!accessToken) {
    if (isPublicPath || pathname === '/') {
      // Allow access to public paths and root
      if (pathname === '/') {
        return NextResponse.redirect(new URL('/login', request.url));
      }
      return NextResponse.next();
    }
    // Redirect to login with return URL
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Verify token
  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jwtVerify(accessToken, secret);
    const userRole = payload.role as string;

    // Authenticated user accessing root - redirect to dashboard
    if (pathname === '/') {
      return NextResponse.redirect(new URL(getDashboardForRole(userRole), request.url));
    }

    // Authenticated user accessing public path - redirect to dashboard
    if (isPublicPath) {
      return NextResponse.redirect(new URL(getDashboardForRole(userRole), request.url));
    }

    // Check role-based access
    for (const [route, allowedRoles] of Object.entries(roleRoutes)) {
      if (pathname.startsWith(route)) {
        if (!allowedRoles.includes(userRole)) {
          // Redirect to appropriate dashboard instead of error page
          return NextResponse.redirect(new URL(getDashboardForRole(userRole), request.url));
        }
        break;
      }
    }

    // Add user info to request headers for server components
    const response = NextResponse.next();
    response.headers.set('x-user-id', payload.sub as string);
    response.headers.set('x-user-role', userRole);
    response.headers.set('x-user-email', payload.email as string);
    return response;

  } catch (error) {
    // Invalid/expired token - clear cookie and redirect to login
    const response = NextResponse.redirect(new URL('/login', request.url));
    response.cookies.delete('access_token');
    response.cookies.delete('refresh_token');
    return response;
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
