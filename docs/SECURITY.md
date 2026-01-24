# Security Documentation

## Overview

This document outlines the security measures, best practices, and considerations implemented in the Satcom Workforce application.

## Authentication & Authorization

### JWT-Based Authentication

- **Access Tokens**: Short-lived (15 minutes) JWT tokens for API authentication
- **Refresh Tokens**: Long-lived (7 days) tokens stored securely for session renewal
- **Token Storage**:
  - Web: HTTP-only cookies with `SameSite=Strict` (production) or Zustand with localStorage (development)
  - Mobile: Expo SecureStore (encrypted key-value storage)

### Password Security

- **Hashing**: bcrypt with cost factor of 12
- **Requirements**:
  - Minimum 8 characters
  - At least one uppercase letter
  - At least one lowercase letter
  - At least one number
  - At least one special character

### Device Verification

- First-time device logins trigger OTP verification via email
- Devices are tracked and can be remotely revoked
- Device fingerprinting includes: User-Agent, IP address (hashed), platform

### Role-Based Access Control (RBAC)

Four roles with hierarchical permissions:
1. **SuperAdmin**: Full system access, company management
2. **HR**: User management, leave approvals, reports
3. **Manager**: Team management, timesheet approvals
4. **Employee**: Personal data access only

See [RBAC.md](./RBAC.md) for detailed permission matrix.

## API Security

### Request Validation

- All input validated using class-validator DTOs
- Request body size limits (10MB default)
- File upload restrictions (type, size)

### Rate Limiting

```typescript
// Global rate limits
{
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // requests per window
}

// Auth endpoints (stricter)
{
  windowMs: 15 * 60 * 1000,
  max: 5, // login attempts
}
```

### CORS Configuration

```typescript
{
  origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
}
```

### Headers

Security headers applied via Helmet:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Strict-Transport-Security` (in production)
- `Content-Security-Policy` (configured per environment)

## Data Protection

### Encryption

- **At Rest**: Database encryption (PostgreSQL with pgcrypto)
- **In Transit**: TLS 1.2+ for all connections
- **Sensitive Fields**: Additional encryption for PII using AES-256

### Data Masking

- Email addresses partially masked in logs
- Phone numbers masked except last 4 digits in UI
- Passwords never logged or returned in responses

### Audit Logging

All sensitive operations are logged:
- User authentication events (login, logout, failed attempts)
- Data modifications (create, update, delete)
- Access to sensitive data
- Admin actions

Log format:
```json
{
  "timestamp": "2026-01-19T10:30:00Z",
  "action": "USER_LOGIN",
  "userId": "uuid",
  "ipAddress": "hashed",
  "userAgent": "...",
  "success": true,
  "metadata": {}
}
```

## Geofence Security

### Location Data

- Location coordinates are only collected during check-in
- Opt-in feature requiring explicit user consent
- Location data retention: 90 days (configurable)

### Validation

- Server-side distance calculation using Haversine formula
- Office coordinates stored securely
- Tolerance radius configurable per office (default: 100m)

## WebSocket Security

### Authentication

- JWT validation on connection
- Token passed via query parameter (initial handshake)
- Periodic token refresh for long-lived connections

### Message Validation

- All WebSocket events validated before processing
- Rate limiting on message frequency
- Maximum message size limits

## File Upload Security

### Validation

- File type whitelist (images, documents)
- Magic number verification (not just extension)
- Maximum file size: 10MB
- Virus scanning (when integrated with ClamAV)

### Storage

- Files stored in MinIO (S3-compatible)
- Pre-signed URLs with short expiration
- Separate buckets for different data types

## Secrets Management

### Environment Variables

Required secrets (never commit to version control):
- `DATABASE_URL`
- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- `MINIO_ACCESS_KEY`
- `MINIO_SECRET_KEY`
- `SMTP_PASSWORD` (if email enabled)

### Secret Rotation

- JWT secrets should be rotated quarterly
- Database credentials rotated monthly
- API keys rotated upon team member departure

## Vulnerability Management

### Dependencies

- Regular dependency updates (weekly)
- Automated vulnerability scanning with npm audit
- Snyk integration for continuous monitoring

### Security Testing

- SAST (Static Application Security Testing) in CI pipeline
- Periodic penetration testing (quarterly)
- Bug bounty program (recommended for production)

## Incident Response

### Detection

- Anomaly detection for unusual patterns:
  - Multiple failed login attempts
  - Access from unusual locations
  - Data access patterns

### Response Plan

1. **Identification**: Alert triggered, initial assessment
2. **Containment**: Isolate affected systems
3. **Eradication**: Remove threat
4. **Recovery**: Restore normal operations
5. **Lessons Learned**: Post-incident review

### Contact

Security issues should be reported to: security@satcom.com

## Compliance Considerations

### Data Privacy

- User consent for data collection
- Right to access personal data
- Right to deletion (where applicable)
- Data portability

### Retention Policies

| Data Type | Retention Period |
|-----------|------------------|
| Audit Logs | 2 years |
| Attendance Records | 7 years |
| Chat Messages | 1 year |
| Location Data | 90 days |
| Session Tokens | 7 days |

## Development Security

### Code Review

- All code changes require peer review
- Security-focused review for sensitive changes
- Automated linting for security patterns

### Secure Coding Guidelines

1. Never trust user input
2. Use parameterized queries (Prisma handles this)
3. Implement proper error handling (no stack traces in production)
4. Follow principle of least privilege
5. Log security events, not sensitive data

## Production Hardening

### Checklist

- [ ] Disable debug mode
- [ ] Enable all security headers
- [ ] Configure proper CORS origins
- [ ] Set secure cookie flags
- [ ] Enable rate limiting
- [ ] Configure firewall rules
- [ ] Set up monitoring and alerting
- [ ] Enable database connection pooling
- [ ] Configure proper SSL/TLS
- [ ] Remove default/demo credentials
