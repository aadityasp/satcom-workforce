# Architecture

**Mapped:** 2026-01-24

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Clients                                   │
│   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐         │
│   │   Web App   │    │ Mobile App  │    │  Admin UI   │         │
│   │  (Next.js)  │    │   (Expo)    │    │ (in Web)    │         │
│   └──────┬──────┘    └──────┬──────┘    └──────┬──────┘         │
└──────────┼──────────────────┼──────────────────┼────────────────┘
           │                  │                  │
           ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                     NestJS API (apps/api)                       │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐  │
│  │  Auth   │ │Attendance│ │Timesheets│ │  Leaves │ │   Chat  │  │
│  │ Module  │ │  Module  │ │  Module  │ │  Module │ │  Module │  │
│  └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘  │
│       └──────────────────────────────────────────────────┘      │
│                              │                                   │
│                    ┌─────────┴─────────┐                        │
│                    │   Prisma Client   │                        │
│                    └─────────┬─────────┘                        │
└──────────────────────────────┼──────────────────────────────────┘
                               │
           ┌───────────────────┼───────────────────┐
           ▼                   ▼                   ▼
┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐
│   PostgreSQL     │ │      MinIO       │ │     MailHog      │
│   (Database)     │ │ (File Storage)   │ │     (Email)      │
└──────────────────┘ └──────────────────┘ └──────────────────┘
```

## Architectural Pattern

**Modular Monolith** with clear domain boundaries in the API.

- Each NestJS module encapsulates one domain (auth, attendance, timesheets, etc.)
- Shared package provides cross-cutting types and theme
- Monorepo enables code sharing while maintaining deployment flexibility

## API Architecture

### Layer Structure

```
Controller Layer    → HTTP endpoints, request/response mapping
    │
Service Layer       → Business logic, orchestration
    │
Prisma/Repository   → Data access, queries
    │
Database            → PostgreSQL
```

### Module Organization

Each feature module follows the same structure:

```
apps/api/src/{module}/
├── {module}.module.ts      # Module definition, imports
├── {module}.controller.ts  # HTTP endpoints
├── {module}.service.ts     # Business logic
├── dto/                    # Request/response DTOs
│   ├── create-{entity}.dto.ts
│   └── update-{entity}.dto.ts
├── guards/                 # Module-specific guards (if any)
├── decorators/             # Custom decorators (if any)
└── {module}.gateway.ts     # WebSocket gateway (if real-time)
```

### Request Flow

```
1. HTTP Request
   │
2. Global Pipes (validation)
   │
3. Guards (JwtAuthGuard → RolesGuard)
   │
4. Interceptors
   │
5. Controller method
   │
6. Service → Prisma → DB
   │
7. Response transformation
```

### Authentication Flow

```
┌────────────┐     ┌────────────┐     ┌────────────┐
│   Client   │────▶│  /login    │────▶│ Validate   │
│            │     │            │     │ Credentials│
└────────────┘     └────────────┘     └─────┬──────┘
                                            │
                   ┌────────────┐     ┌─────▼──────┐
                   │  Return    │◀────│ Generate   │
                   │  Tokens    │     │ JWT Pair   │
                   └────────────┘     └────────────┘

Protected Request:
┌────────────┐     ┌────────────┐     ┌────────────┐
│   Client   │────▶│JwtAuthGuard│────▶│ Validate   │
│ + Bearer   │     │            │     │   Token    │
└────────────┘     └────────────┘     └─────┬──────┘
                                            │
                   ┌────────────┐     ┌─────▼──────┐
                   │  Controller│◀────│  Inject    │
                   │   Method   │     │   User     │
                   └────────────┘     └────────────┘
```

### WebSocket Architecture

Two gateways handle real-time features:

**Presence Gateway** (`apps/api/src/presence/presence.gateway.ts`)
- Namespace: `/presence`
- Events: `heartbeat`, `presence:update`, `presence:batch`
- Maintains user online/away/offline status

**Chat Gateway** (`apps/api/src/chat/chat.gateway.ts`)
- Namespace: `/chat`
- Events: `chat:join`, `chat:message`, `chat:typing`
- Real-time messaging with read receipts

## Web Architecture

### Next.js App Router Structure

```
apps/web/src/app/
├── layout.tsx          # Root layout with providers
├── page.tsx            # Landing/redirect
├── providers.tsx       # React Query, etc.
├── globals.css         # Tailwind imports
├── login/
│   └── page.tsx        # Login page
├── dashboard/
│   └── page.tsx        # Main dashboard
├── admin/              # Admin section
│   ├── layout.tsx      # Admin layout with sidebar
│   ├── attendance/
│   ├── leaves/
│   ├── users/
│   ├── reports/
│   ├── anomalies/
│   └── settings/
└── [feature]/
    └── page.tsx
```

### State Management Pattern

```
┌────────────────────────────────────────────────┐
│               Component                         │
│  ┌──────────────┐    ┌──────────────┐         │
│  │   Zustand    │    │ TanStack     │         │
│  │   Store      │    │   Query      │         │
│  │ (client UI)  │    │ (server data)│         │
│  └──────┬───────┘    └──────┬───────┘         │
└─────────┼───────────────────┼──────────────────┘
          │                   │
          ▼                   ▼
   Local State           API Fetch + Cache
   (auth, modals)        (with automatic refetch)
```

## Mobile Architecture

### Expo Router File-Based Navigation

```
apps/mobile/app/
├── _layout.tsx         # Root layout
├── index.tsx           # Entry redirect
├── login.tsx           # Login screen
└── (tabs)/             # Tab navigator
    ├── _layout.tsx     # Tab bar config
    ├── index.tsx       # Dashboard tab
    ├── timesheet.tsx   # Timesheet tab
    ├── team.tsx        # Team tab
    └── profile.tsx     # Profile tab
```

### Mobile State Pattern

Same as web:
- **Zustand** for auth (persisted to SecureStore)
- **TanStack Query** for server data

## Data Flow

### Attendance Check-In Flow

```
1. Mobile: User taps "Check In"
   │
2. Mobile: Requests GPS location (if geofence enabled)
   │
3. API: POST /attendance/check-in
   │   └─ { workMode, latitude?, longitude? }
   │
4. API: AttendanceService.checkIn()
   │   ├─ Get/create AttendanceDay for today
   │   ├─ Validate geofence if required
   │   └─ Create AttendanceEvent
   │
5. API: Broadcast presence update via WebSocket
   │
6. All connected clients receive update
```

### Anomaly Detection Flow

```
1. Cron: Every hour (scheduled via NestJS @Cron)
   │
2. AnomalyDetectionService.runDetection()
   │
3. For each enabled rule:
   │   ├─ Query relevant data (attendance, timesheets)
   │   ├─ Apply threshold logic
   │   └─ Create AnomalyEvent if triggered
   │
4. Anomalies appear in admin dashboard
```

## Cross-Cutting Concerns

### Rate Limiting

Global throttler in `AppModule`:
- Short: 3 requests/second
- Medium: 20 requests/10 seconds
- Long: 100 requests/minute

Per-endpoint overrides with `@Throttle()` decorator.

### RBAC

Roles: `SuperAdmin`, `HR`, `Manager`, `Employee`

```typescript
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.HR, UserRole.SuperAdmin)
@Get('sensitive')
getSensitiveData() { ... }
```

### Audit Logging

Sensitive actions logged to `audit_logs` table:
- Actor, action, entity type/id
- Before/after state (JSON)
- IP address, user agent

## Build Order

For initial setup or after pulling:

```
1. packages/shared    # Build shared types/theme first
2. apps/api          # Can build independently (uses shared)
3. apps/web          # Depends on shared
4. apps/mobile       # Depends on shared
```

## Deployment Considerations

- **API**: Containerizable Node.js app
- **Web**: Vercel/static export or Node.js server
- **Mobile**: Expo EAS Build for iOS/Android
- **Database**: Managed PostgreSQL (RDS, Cloud SQL, etc.)
- **Storage**: S3-compatible (MinIO for dev, S3/GCS for prod)
