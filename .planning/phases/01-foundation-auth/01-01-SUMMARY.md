# Plan 01-01 Summary: Enhanced NestJS Auth with Dual-Token JWT

**Phase:** 01-foundation-auth
**Plan:** 01
**Status:** Complete
**Completed:** 2026-01-24

## Objective

Enhance NestJS auth module with dual-token JWT strategy and database-backed refresh tokens for secure session management.

## Deliverables

### Task 1: Prisma Schema Updates
- Added `RefreshToken` model with hashed token storage and expiry
- Added `PasswordResetToken` model with used-at tracking
- Added relations to User model
- **Commit:** `03d8af0` - feat(01-01): add RefreshToken and PasswordResetToken models

### Task 2: JWT Refresh Strategy and Guards
- Created `JwtRefreshStrategy` for validating refresh tokens
- Created `JwtRefreshGuard` for protecting refresh endpoint
- Created `@Public()` decorator to bypass auth
- Updated `JwtAuthGuard` to respect @Public() decorator
- **Commit:** `734fd07` - feat(01-01): add JWT refresh strategy and enhance auth guards

### Task 3: Auth Service Refactoring
- Removed in-memory token storage
- Tokens now stored hashed in PostgreSQL
- Token rotation on refresh (old deleted, new created)
- `validateRefreshToken` method for strategy
- `logoutAllDevices` for multi-device logout
- Global guards registered: JwtAuthGuard, RolesGuard
- **Commit:** `339d709` - feat(01-01): refactor auth for database-backed refresh tokens

## Files Modified

| File | Change |
|------|--------|
| `apps/api/prisma/schema.prisma` | Added RefreshToken and PasswordResetToken models |
| `apps/api/src/auth/strategies/jwt-refresh.strategy.ts` | New - refresh token validation |
| `apps/api/src/auth/guards/jwt-refresh.guard.ts` | New - refresh endpoint guard |
| `apps/api/src/auth/guards/jwt-auth.guard.ts` | Updated to respect @Public() |
| `apps/api/src/auth/decorators/public.decorator.ts` | New - bypass auth decorator |
| `apps/api/src/auth/auth.service.ts` | Refactored for DB-backed tokens |
| `apps/api/src/auth/auth.module.ts` | Added strategies and global guards |
| `apps/api/src/auth/auth.controller.ts` | Added @Public(), updated endpoints |

## Verification Notes

- Database migration required: `npx prisma migrate dev --name add_auth_tokens`
- JWT_REFRESH_SECRET env var recommended (falls back to JWT_SECRET)
- Token expiry: access 15m, refresh 7d (configurable)

## Deviations

None.

## Next Steps

- Run database migration before testing
- Plan 01-02 will implement frontend middleware for route protection
