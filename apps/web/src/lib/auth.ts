/**
 * Auth Utilities
 *
 * Token verification, role checking, and auth helpers for the web app.
 */

import { jwtVerify, type JWTPayload } from 'jose';

export interface TokenPayload extends JWTPayload {
  sub: string;
  email: string;
  role: 'Employee' | 'Manager' | 'HR' | 'SuperAdmin';
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface User {
  id: string;
  email: string;
  role: TokenPayload['role'];
  profile?: {
    firstName: string;
    lastName: string;
    designation?: string;
    avatarUrl?: string;
  };
}

/**
 * Verify JWT token and extract payload
 */
export async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    return payload as TokenPayload;
  } catch {
    return null;
  }
}

/**
 * Check if user has required role (with hierarchy)
 */
export function hasRole(userRole: string, allowedRoles: string[]): boolean {
  // Role hierarchy: SuperAdmin > HR > Manager > Employee
  const roleHierarchy: Record<string, number> = {
    SuperAdmin: 4,
    HR: 3,
    Manager: 2,
    Employee: 1,
  };

  const userLevel = roleHierarchy[userRole] || 0;
  return allowedRoles.some(role => roleHierarchy[role] <= userLevel);
}

/**
 * Role-based route access configuration
 */
export const routeRoles: Record<string, string[]> = {
  '/admin': ['SuperAdmin'],
  '/hr': ['SuperAdmin', 'HR'],
  '/team': ['SuperAdmin', 'HR', 'Manager'],
  '/dashboard': ['SuperAdmin', 'HR', 'Manager', 'Employee'],
  '/timesheets': ['SuperAdmin', 'HR', 'Manager', 'Employee'],
  '/leaves': ['SuperAdmin', 'HR', 'Manager', 'Employee'],
  '/chat': ['SuperAdmin', 'HR', 'Manager', 'Employee'],
};

/**
 * Get the appropriate dashboard route for a role
 */
export function getDashboardRoute(role: string): string {
  switch (role) {
    case 'SuperAdmin':
      return '/admin';
    case 'HR':
      return '/hr';
    case 'Manager':
      return '/team';
    default:
      return '/dashboard';
  }
}

/**
 * Public paths that don't require authentication
 */
export const publicPaths = ['/login', '/forgot-password', '/reset-password'];

/**
 * Check if a path is public
 */
export function isPublicPath(pathname: string): boolean {
  return publicPaths.some(path => pathname.startsWith(path));
}
