# External Integrations

**Mapped:** 2026-01-24

## Database

### PostgreSQL 16

**Connection:** Prisma Client
**Config:** `DATABASE_URL` environment variable

```
DATABASE_URL="postgresql://satcom:satcom_dev_password@localhost:5432/satcom_workforce"
```

**Docker (local dev):**
```yaml
postgres:
  image: postgres:16-alpine
  ports: ["5432:5432"]
  environment:
    POSTGRES_USER: satcom
    POSTGRES_PASSWORD: satcom_dev_password
    POSTGRES_DB: satcom_workforce
```

**Schema location:** `apps/api/prisma/schema.prisma`

**Models (25+):**
- Company, User, EmployeeProfile
- AttendanceDay, AttendanceEvent, BreakSegment
- TimesheetEntry, TimesheetAttachment
- LeaveTypeConfig, LeaveBalance, LeaveRequest, Holiday
- Project, Task
- PresenceSession, HeartbeatEvent
- ChatThread, ChatMember, ChatMessage
- OfficeLocation, GeofencePolicy
- AnomalyRule, AnomalyEvent
- WorkPolicy, RetentionPolicy
- AuditLog, DeviceRecord

## Object Storage

### MinIO (S3-compatible)

**Client:** `minio` npm package
**Service:** `apps/api/src/storage/storage.service.ts`

**Purpose:**
- Voice note uploads
- Timesheet attachments
- Profile avatars

**Docker (local dev):**
```yaml
minio:
  image: minio/minio:latest
  command: server /data --console-address ":9001"
  ports:
    - "9000:9000"   # API
    - "9001:9001"   # Console
  environment:
    MINIO_ROOT_USER: satcom_minio
    MINIO_ROOT_PASSWORD: satcom_minio_secret
```

**Config env vars:**
```
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=satcom_minio
MINIO_SECRET_KEY=satcom_minio_secret
MINIO_BUCKET=satcom-workforce
```

**Console URL:** http://localhost:9001

## Email

### Nodemailer + MailHog (dev)

**Client:** `nodemailer` npm package
**Service:** Used in `apps/api/src/auth/auth.service.ts`

**Purpose:**
- Password reset emails
- OTP verification emails (new devices)
- Leave approval notifications (future)

**Docker (local dev):**
```yaml
mailhog:
  image: mailhog/mailhog:latest
  ports:
    - "1025:1025"   # SMTP
    - "8025:8025"   # Web UI
```

**Config env vars:**
```
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_USER=
SMTP_PASS=
SMTP_FROM=noreply@satcom.com
```

**MailHog UI:** http://localhost:8025

## Real-time Communication

### Socket.IO

**Server:** `@nestjs/platform-socket.io`
**Client:** `socket.io-client` (web + mobile)

**Namespaces:**

| Namespace | Purpose | Gateway Location |
|-----------|---------|------------------|
| `/presence` | User online status | `apps/api/src/presence/presence.gateway.ts` |
| `/chat` | Real-time messaging | `apps/api/src/chat/chat.gateway.ts` |

**Presence Events:**
```typescript
// Client → Server
'heartbeat': { userId, projectId?, taskId? }

// Server → Client
'presence:update': { userId, status, lastSeenAt }
'presence:batch': { users: PresenceUpdate[] }
```

**Chat Events:**
```typescript
// Client → Server
'chat:join': { threadId }
'chat:message': { threadId, content, type }
'chat:typing': { threadId, isTyping }

// Server → Client
'chat:message': { message }
'chat:typing': { userId, threadId, isTyping }
```

## Authentication

### JWT (Passport.js)

**Packages:**
- `@nestjs/jwt`
- `@nestjs/passport`
- `passport-jwt`

**Strategy:** `apps/api/src/auth/strategies/jwt.strategy.ts`
**Guard:** `apps/api/src/auth/guards/jwt-auth.guard.ts`

**Config env vars:**
```
JWT_SECRET=your-super-secret-key-change-in-production
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=your-refresh-secret-key
JWT_REFRESH_EXPIRES_IN=7d
```

**Token flow:**
1. Login returns `accessToken` (15m) + `refreshToken` (7d)
2. Access token in `Authorization: Bearer <token>`
3. Refresh via `POST /auth/refresh` with refresh token

## API Documentation

### Swagger/OpenAPI

**Package:** `@nestjs/swagger`
**URL:** http://localhost:3001/api/docs (when running)

**Setup in `apps/api/src/main.ts`:**
```typescript
const config = new DocumentBuilder()
  .setTitle('Satcom Workforce API')
  .setVersion('1.0')
  .addBearerAuth()
  .build();
const document = SwaggerModule.createDocument(app, config);
SwaggerModule.setup('api/docs', app, document);
```

## Location Services

### GPS/Geofence

**Mobile:** `expo-location` for GPS coordinates
**API:** `apps/api/src/attendance/geofence.service.ts`

**Algorithm:** Haversine formula for distance calculation

**Flow:**
1. Mobile gets current position via `expo-location`
2. Sends lat/long with check-in request
3. API validates against `OfficeLocation` entities
4. Returns `VerificationStatus` (GeofencePassed/GeofenceFailed)

**Config:** Per-company via `GeofencePolicy` model

## Scheduled Jobs

### NestJS Schedule

**Package:** `@nestjs/schedule`

**Cron jobs:**
- Anomaly detection (hourly)
- Data retention cleanup (daily)
- Presence timeout (every 5 minutes)

**Setup:** Enabled via `ScheduleModule.forRoot()` in `AppModule`

## Rate Limiting

### NestJS Throttler

**Package:** `@nestjs/throttler`

**Global config in `AppModule`:**
```typescript
ThrottlerModule.forRoot([
  { name: 'short', ttl: 1000, limit: 3 },
  { name: 'medium', ttl: 10000, limit: 20 },
  { name: 'long', ttl: 60000, limit: 100 },
])
```

**Per-endpoint override:**
```typescript
@Throttle({ default: { limit: 5, ttl: 60000 } })
@Post('login')
```

## External APIs (Not Yet Integrated)

These are mentioned in `docs/` but not implemented:

| Integration | Status | Notes |
|-------------|--------|-------|
| Firebase Push | Planned | Push notifications |
| Google Calendar | Planned | Calendar sync |
| Outlook Calendar | Planned | Calendar sync |
| SSO (SAML/OIDC) | Phase 3 | Enterprise auth |
| Redis | Planned | Session cache, rate limiting |

## Environment Variables Summary

```bash
# Database
DATABASE_URL=postgresql://satcom:satcom_dev_password@localhost:5432/satcom_workforce

# JWT
JWT_SECRET=your-super-secret-key
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=your-refresh-secret
JWT_REFRESH_EXPIRES_IN=7d

# MinIO
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=satcom_minio
MINIO_SECRET_KEY=satcom_minio_secret
MINIO_BUCKET=satcom-workforce

# Email (MailHog for dev)
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_USER=
SMTP_PASS=
SMTP_FROM=noreply@satcom.com

# App
PORT=3001
NODE_ENV=development
```
