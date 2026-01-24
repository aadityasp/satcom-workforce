# Concerns & Technical Debt

**Mapped:** 2026-01-24

## Critical Issues

### 1. No Test Coverage

**Severity:** High
**Location:** All packages

No tests exist despite Jest and Playwright being configured. This makes refactoring risky and deployment uncertain.

**Risk:**
- Bugs shipped to production
- Regression when adding features
- No confidence in changes

**Remediation:**
- Add unit tests for all services
- Add E2E tests for critical user flows
- Set up CI to run tests before merge

### 2. Hardcoded Secrets in Docker Compose

**Severity:** High
**Location:** `docker-compose.yml`

```yaml
POSTGRES_PASSWORD: satcom_dev_password
MINIO_SECRET_KEY: satcom_minio_secret
```

**Risk:** Secrets leaked if docker-compose.yml is committed with real values

**Remediation:**
- Use `.env` file for secrets
- Add `.env` to `.gitignore`
- Use environment variable references in docker-compose

### 3. No Input Sanitization for SQL

**Severity:** Medium
**Location:** Prisma queries

While Prisma provides parameterized queries by default, any raw SQL usage needs review.

**Check for:**
- `prisma.$queryRaw` usage
- `prisma.$executeRaw` usage

**Remediation:**
- Audit all raw query usage
- Ensure parameterized queries
- Add SQL injection tests

## Security Concerns

### JWT Secret Management

**Location:** `apps/api/src/auth/`

**Issues:**
- JWT secrets likely hardcoded in development
- No secret rotation mechanism
- Refresh token stored client-side

**Recommendations:**
- Use environment variables (done)
- Implement secret rotation
- Consider HttpOnly cookies for refresh tokens

### Rate Limiting Bypass

**Location:** `apps/api/src/app.module.ts`

Rate limiting configured but could be bypassed with:
- Distributed attacks (different IPs)
- No per-user rate limiting

**Recommendations:**
- Add per-user rate limits
- Consider Redis-backed rate limiting for distributed deployments

### Missing Security Headers

**Location:** `apps/api/src/main.ts`

Check if these are configured:
- CORS (appears configured)
- Helmet (not detected)
- CSRF protection (not applicable for API-only)

**Recommendations:**
- Add Helmet middleware
- Review CORS configuration for production

## Performance Concerns

### N+1 Query Potential

**Location:** Various services

Prisma can cause N+1 queries if relations not properly included.

**Example (potential issue):**
```typescript
const users = await prisma.user.findMany();
// Then looping through users to get profiles separately
```

**Better approach:**
```typescript
const users = await prisma.user.findMany({
  include: { profile: true }
});
```

**Recommendation:** Audit all Prisma queries for proper `include` usage

### WebSocket Connection Limits

**Location:** Presence and Chat gateways

No apparent connection limits or room management.

**Risks:**
- Memory exhaustion with many connections
- No graceful degradation

**Recommendations:**
- Implement connection pooling
- Add max connections per user
- Implement backpressure handling

### Large File Uploads

**Location:** `apps/api/src/storage/storage.service.ts`

No apparent file size limits or chunked uploads.

**Risks:**
- Memory exhaustion on large uploads
- DoS via large files

**Recommendations:**
- Add file size limits
- Implement chunked uploads for large files
- Add file type validation

## Code Quality Issues

### Empty Common Directories

**Location:** `apps/api/src/common/`

Several common directories are empty:
- `decorators/` (empty)
- `filters/` (empty)
- `guards/` (empty)
- `interceptors/` (empty)
- `pipes/` (empty)

These may be scaffolded but unused, or missing implementations.

**Recommendation:** Either populate with shared utilities or remove empty directories

### Inconsistent Error Handling

**Location:** Various controllers

Some endpoints return `{ success: true, data }` while error handling may not be consistent.

**Recommendation:**
- Implement global exception filter
- Standardize error response format
- Add error codes for client handling

### Missing Validation in DTOs

**Location:** Various DTOs

Some DTOs may lack complete validation decorators.

**Recommendation:**
- Audit all DTOs for proper validation
- Add custom validators where needed
- Test validation edge cases

## Scalability Concerns

### Single Database

**Location:** Prisma configuration

Currently single PostgreSQL instance.

**For scaling:**
- Read replicas for heavy read loads
- Connection pooling (PgBouncer)
- Consider partitioning for large tables (audit_logs, heartbeat_events)

### No Caching Layer

**Location:** Throughout API

No Redis or caching detected.

**Should cache:**
- User sessions
- Company configurations
- Frequently accessed lookups

**Recommendation:** Add Redis for:
- Session storage
- Rate limiting (distributed)
- Query caching

### Monolith Deployment

Current architecture is a modular monolith. For future scaling:
- Each module could become a microservice
- Use message queues for async operations
- Implement API gateway

## Operational Concerns

### No Monitoring/Observability

**Missing:**
- Application metrics (Prometheus)
- Distributed tracing
- Error tracking (Sentry)
- Log aggregation

**Recommendation:** Add observability before production

### No Health Checks

**Location:** `apps/api/src/main.ts`

No `/health` endpoint detected for load balancer health checks.

**Recommendation:** Add health check endpoint that verifies:
- Database connectivity
- MinIO connectivity
- Memory/CPU status

### No Graceful Shutdown

**Location:** `apps/api/src/main.ts`

Check if graceful shutdown is implemented for:
- Draining WebSocket connections
- Completing in-flight requests
- Closing database connections

## Known Limitations (from FINAL_REPORT.md)

1. **Offline Support:** Not implemented - requires connection
2. **Push Notifications:** Not configured - manual refresh needed
3. **Email Integration:** MailHog for dev only - needs production SMTP
4. **Voice Notes:** UI only - recording not implemented
5. **Geofence:** Basic implementation - no background tracking

## Technical Debt Summary

| Priority | Issue | Effort |
|----------|-------|--------|
| High | Add test coverage | Large |
| High | Remove hardcoded secrets | Small |
| High | Add health checks | Small |
| Medium | Add monitoring | Medium |
| Medium | Add caching layer | Medium |
| Medium | Audit N+1 queries | Medium |
| Low | Clean empty directories | Small |
| Low | Standardize error handling | Medium |

## Recommended First Actions

1. **Immediately:**
   - Move secrets to environment variables
   - Add basic health check endpoint
   - Set up error tracking (Sentry)

2. **Before Production:**
   - Add critical path tests (auth, attendance)
   - Configure production CORS
   - Add Helmet security headers
   - Set up monitoring

3. **Ongoing:**
   - Increase test coverage
   - Performance profiling
   - Security audits
