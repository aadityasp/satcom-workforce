# Phase 1: Foundation & Auth - Research

**Researched:** 2026-01-24
**Domain:** Authentication, Authorization, Session Management
**Confidence:** HIGH

## Summary

This phase establishes the authentication foundation for a NestJS + Next.js workforce application with 4 roles (Employee, Manager, HR, SuperAdmin). The standard approach uses JWT-based authentication with access and refresh tokens, role-based access control via guards, and Prisma for user/session persistence.

Key findings:
- Use NestJS's built-in `@nestjs/jwt` and `@nestjs/passport` with dual-token strategy (short-lived access + long-lived refresh)
- Argon2id is the recommended password hashing algorithm for new systems (winner of Password Hashing Competition)
- RBAC via custom guards is sufficient for 4 fixed roles; CASL adds unnecessary complexity
- Next.js middleware handles route protection with JWT validation

**Primary recommendation:** Implement stateful JWT with refresh tokens stored hashed in database, Argon2id for password hashing, custom NestJS guards for RBAC, and Next.js middleware for frontend route protection.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @nestjs/passport | ^10.x | Auth framework integration | Official NestJS auth strategy |
| @nestjs/jwt | ^10.x | JWT signing/verification | Official NestJS JWT support |
| passport-jwt | ^4.x | JWT passport strategy | Industry standard JWT validation |
| passport-local | ^1.x | Email/password strategy | Standard local auth strategy |
| argon2 | ^0.31.x | Password hashing | Most secure, winner of PHC 2015 |
| @prisma/client | ^6.x | Database ORM | Project tech stack |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| nodemailer | ^6.x | Email sending | Password reset, notifications |
| class-validator | ^0.14.x | DTO validation | Request body validation |
| class-transformer | ^0.5.x | Object transformation | DTO transformation |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Argon2 | bcrypt | bcrypt is simpler but less secure against GPU attacks |
| Custom RBAC | CASL | CASL adds complexity; overkill for 4 fixed roles |
| Passport | Custom guards | Passport provides proven patterns and strategies |

**Installation:**
```bash
npm install @nestjs/passport @nestjs/jwt passport passport-jwt passport-local argon2 nodemailer
npm install -D @types/passport-jwt @types/passport-local @types/nodemailer
```

## Architecture Patterns

### Recommended Project Structure
```
apps/
├── api/                      # NestJS backend
│   └── src/
│       ├── auth/             # Authentication module
│       │   ├── auth.module.ts
│       │   ├── auth.controller.ts
│       │   ├── auth.service.ts
│       │   ├── strategies/
│       │   │   ├── local.strategy.ts
│       │   │   ├── jwt.strategy.ts
│       │   │   └── jwt-refresh.strategy.ts
│       │   ├── guards/
│       │   │   ├── local-auth.guard.ts
│       │   │   ├── jwt-auth.guard.ts
│       │   │   ├── jwt-refresh.guard.ts
│       │   │   └── roles.guard.ts
│       │   ├── decorators/
│       │   │   ├── roles.decorator.ts
│       │   │   ├── current-user.decorator.ts
│       │   │   └── public.decorator.ts
│       │   └── dto/
│       │       ├── login.dto.ts
│       │       ├── register.dto.ts
│       │       └── reset-password.dto.ts
│       ├── users/            # User management module
│       │   ├── users.module.ts
│       │   ├── users.service.ts
│       │   └── users.controller.ts
│       └── common/           # Shared utilities
│           ├── enums/
│           │   └── role.enum.ts
│           └── types/
│               └── jwt-payload.type.ts
└── web/                      # Next.js frontend
    └── src/
        ├── middleware.ts     # Auth middleware for route protection
        ├── lib/
        │   └── auth.ts       # Auth utilities
        └── app/
            ├── (auth)/       # Public auth routes
            │   ├── login/
            │   └── reset-password/
            └── (dashboard)/  # Protected routes
                └── ...
```

### Pattern 1: Dual-Token JWT Strategy
**What:** Separate access token (15 min) and refresh token (7 days) with different secrets
**When to use:** All authenticated API access
**Example:**
```typescript
// jwt.strategy.ts - Access token validation
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: configService.get('JWT_ACCESS_SECRET'),
      ignoreExpiration: false,
    });
  }

  async validate(payload: JwtPayload) {
    return { userId: payload.sub, email: payload.email, role: payload.role };
  }
}

// jwt-refresh.strategy.ts - Refresh token validation
@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: configService.get('JWT_REFRESH_SECRET'),
      passReqToCallback: true,
    });
  }

  async validate(req: Request, payload: JwtPayload) {
    const refreshToken = req.headers.authorization?.split(' ')[1];
    return { userId: payload.sub, refreshToken };
  }
}
```

### Pattern 2: Role-Based Guard
**What:** Custom decorator + guard for role-based route protection
**When to use:** Any endpoint with role restrictions
**Example:**
```typescript
// roles.decorator.ts
export const ROLES_KEY = 'roles';
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);

// roles.guard.ts
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles) return true;

    const { user } = context.switchToHttp().getRequest();
    return requiredRoles.some((role) => user.role === role);
  }
}

// Usage in controller
@Get('admin/users')
@Roles(Role.SUPER_ADMIN, Role.HR)
getUsers() { ... }
```

### Pattern 3: Global JWT Guard with Public Routes
**What:** JWT guard applied globally with @Public() decorator for exceptions
**When to use:** Most routes need auth, few are public
**Example:**
```typescript
// app.module.ts
providers: [
  { provide: APP_GUARD, useClass: JwtAuthGuard },
  { provide: APP_GUARD, useClass: RolesGuard },
]

// public.decorator.ts
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

// jwt-auth.guard.ts
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) { super(); }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;
    return super.canActivate(context);
  }
}
```

### Anti-Patterns to Avoid
- **Storing refresh tokens unhashed:** Always hash refresh tokens before database storage
- **Same secret for access and refresh:** Use different secrets to prevent token confusion attacks
- **Long-lived access tokens:** Keep access tokens short (15-30 min max)
- **Storing tokens in localStorage:** Use httpOnly cookies for web to prevent XSS
- **Checking roles in service layer only:** Always enforce at guard level as first line of defense

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Password hashing | Custom hash function | argon2 | Cryptographic expertise required, timing attacks |
| JWT generation | Manual token building | @nestjs/jwt | Handles signing, expiration, validation |
| Password strategy | Custom login logic | passport-local | Handles credential extraction, validation |
| Request validation | Manual if checks | class-validator | Declarative, type-safe, standardized |
| Token rotation | Manual tracking | Built into refresh strategy | Edge cases around concurrent requests |

**Key insight:** Authentication has decades of known attacks. Every "simple" implementation likely has a vulnerability that libraries already mitigate.

## Common Pitfalls

### Pitfall 1: Token Storage Vulnerability
**What goes wrong:** XSS attacks steal tokens from localStorage, enabling account takeover
**Why it happens:** localStorage is accessible to any JavaScript on the page
**How to avoid:** Store refresh tokens in httpOnly cookies; access tokens can be in memory
**Warning signs:** Tokens visible in browser DevTools Application tab

### Pitfall 2: Refresh Token Reuse
**What goes wrong:** Stolen refresh token used indefinitely
**Why it happens:** No rotation or invalidation on use
**How to avoid:** Implement token rotation - issue new refresh token on each refresh, invalidate old
**Warning signs:** Same refresh token seen in multiple requests over days

### Pitfall 3: Race Condition on Refresh
**What goes wrong:** Multiple tabs send concurrent refresh requests, one invalidates the other's token
**Why it happens:** Token rotation without grace period
**How to avoid:** Either use token families (detect reuse) or add short grace period for old token
**Warning signs:** Users randomly logged out, especially with multiple tabs open

### Pitfall 4: Email Enumeration
**What goes wrong:** Attackers learn which emails have accounts via login/reset responses
**Why it happens:** Different error messages for "user not found" vs "wrong password"
**How to avoid:** Same response time and message regardless of email existence
**Warning signs:** Security audit flags timing differences on auth endpoints

### Pitfall 5: Password Reset Token Reuse
**What goes wrong:** Reset link used multiple times to change password
**Why it happens:** Token not invalidated after first use
**How to avoid:** Delete/invalidate token immediately on successful password change
**Warning signs:** Same reset link works after password already changed

## Code Examples

Verified patterns from official sources:

### Password Hashing with Argon2
```typescript
import * as argon2 from 'argon2';

// Hashing a password
const hash = await argon2.hash(password, {
  type: argon2.argon2id,  // Recommended variant
  memoryCost: 65536,      // 64 MB
  timeCost: 3,            // 3 iterations
  parallelism: 4,         // 4 threads
});

// Verifying a password
const isValid = await argon2.verify(hash, password);
```

### Prisma User/Session Schema
```prisma
enum Role {
  EMPLOYEE
  MANAGER
  HR
  SUPER_ADMIN
}

model User {
  id             String    @id @default(cuid())
  email          String    @unique
  passwordHash   String
  firstName      String
  lastName       String
  role           Role      @default(EMPLOYEE)
  isActive       Boolean   @default(true)
  refreshTokens  RefreshToken[]
  passwordResets PasswordResetToken[]
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt
}

model RefreshToken {
  id           String   @id @default(cuid())
  tokenHash    String   @unique
  userId       String
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  expiresAt    DateTime
  createdAt    DateTime @default(now())

  @@index([userId])
  @@index([expiresAt])
}

model PasswordResetToken {
  id        String   @id @default(cuid())
  tokenHash String   @unique
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  expiresAt DateTime
  usedAt    DateTime?
  createdAt DateTime @default(now())

  @@index([userId])
  @@index([expiresAt])
}
```

### Next.js Middleware Route Protection
```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const publicPaths = ['/login', '/reset-password', '/forgot-password'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths
  if (publicPaths.some(path => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // Check for access token
  const token = request.cookies.get('access_token')?.value;

  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  try {
    const secret = new TextEncoder().encode(process.env.JWT_ACCESS_SECRET);
    await jwtVerify(token, secret);
    return NextResponse.next();
  } catch {
    return NextResponse.redirect(new URL('/login', request.url));
  }
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
```

### Role-Based Route Protection (Next.js)
```typescript
// Check role in middleware
const { payload } = await jwtVerify(token, secret);
const userRole = payload.role as string;
const pathname = request.nextUrl.pathname;

// Define role-based access
const roleRoutes: Record<string, string[]> = {
  '/admin': ['SUPER_ADMIN'],
  '/hr': ['SUPER_ADMIN', 'HR'],
  '/manager': ['SUPER_ADMIN', 'HR', 'MANAGER'],
};

for (const [route, allowedRoles] of Object.entries(roleRoutes)) {
  if (pathname.startsWith(route) && !allowedRoles.includes(userRole)) {
    return NextResponse.redirect(new URL('/unauthorized', request.url));
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| bcrypt | Argon2id | 2015 (PHC winner) | Better GPU/ASIC resistance |
| Single JWT | Dual token (access + refresh) | 2018+ | Better security/UX balance |
| Stateless JWT | Stateful refresh tokens | 2020+ | Enables revocation, rotation |
| localStorage tokens | httpOnly cookies | Best practice | XSS protection |
| MD5/SHA for passwords | Memory-hard functions | 2010+ | GPU attack resistance |

**Deprecated/outdated:**
- **bcrypt work factor < 12:** Insufficient for 2026 hardware, use 13-14 minimum
- **Passport.js session-based auth:** Stateless JWT preferred for API-first apps
- **JWT in URL parameters:** Security risk, use headers/cookies

## Open Questions

Things that couldn't be fully resolved:

1. **Token storage for React Native mobile**
   - What we know: expo-secure-store is recommended for sensitive data
   - What's unclear: Best practice for refresh token rotation in mobile context
   - Recommendation: Use expo-secure-store, implement rotation same as web

2. **Email delivery service**
   - What we know: Nodemailer works with SMTP, AWS SES is production-grade
   - What's unclear: Specific SMTP provider Satcom uses
   - Recommendation: Abstract behind interface, start with Nodemailer + Gmail for dev

## Sources

### Primary (HIGH confidence)
- NestJS Official Documentation - Security/Authentication section
- Argon2 specification and Password Hashing Competition results
- OWASP Authentication Cheat Sheet

### Secondary (MEDIUM confidence)
- [Elvis Duru's NestJS JWT Authentication Guide](https://www.elvisduru.com/blog/nestjs-jwt-authentication-refresh-token)
- [NestJS Official Authorization Documentation](https://docs.nestjs.com/security/authorization)
- [Password Hashing Guide 2025](https://guptadeepak.com/the-complete-guide-to-password-hashing-argon2-vs-bcrypt-vs-scrypt-vs-pbkdf2-2026/)
- [Next.js Official Middleware Documentation](https://nextjs.org/docs/14/app/building-your-application/routing/middleware)

### Tertiary (LOW confidence)
- Medium articles on RBAC patterns (validated against NestJS docs)
- Community patterns on refresh token rotation

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Official NestJS packages, well-documented
- Architecture: HIGH - Follows NestJS conventions, proven patterns
- Pitfalls: HIGH - Based on OWASP, security best practices
- Code examples: MEDIUM - Adapted from multiple sources

**Research date:** 2026-01-24
**Valid until:** 2026-03-24 (stable domain, 60-day validity)
