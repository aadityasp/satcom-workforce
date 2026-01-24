# Directory Structure

**Mapped:** 2026-01-24

## Root Layout

```
satcom_employeetracker/
├── apps/                    # Application packages
│   ├── api/                 # NestJS backend
│   ├── web/                 # Next.js frontend
│   └── mobile/              # Expo React Native
├── packages/                # Shared libraries
│   └── shared/              # Types and theme
├── docs/                    # Project documentation
├── .planning/               # GSD planning documents
├── docker-compose.yml       # Local infrastructure
├── package.json             # Root package with workspaces
├── tsconfig.base.json       # Shared TypeScript config
└── .prettierrc              # Code formatting
```

## API Package (`apps/api/`)

```
apps/api/
├── dist/                    # Compiled output
├── prisma/
│   ├── schema.prisma        # Database schema (778 lines)
│   ├── seed.ts              # Demo data seeder
│   └── migrations/          # Database migrations
│       └── 20260120044455_init/
│           └── migration.sql
├── src/
│   ├── main.ts              # Application entry point
│   ├── app.module.ts        # Root module
│   │
│   ├── prisma/              # Prisma service module
│   │   ├── prisma.module.ts
│   │   └── prisma.service.ts
│   │
│   ├── auth/                # Authentication module
│   │   ├── auth.module.ts
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   ├── dto/
│   │   │   ├── login.dto.ts
│   │   │   ├── verify-otp.dto.ts
│   │   │   ├── refresh-token.dto.ts
│   │   │   └── password-reset.dto.ts
│   │   ├── guards/
│   │   │   └── jwt-auth.guard.ts
│   │   ├── strategies/
│   │   │   └── jwt.strategy.ts
│   │   └── decorators/
│   │       └── current-user.decorator.ts
│   │
│   ├── users/               # User management
│   │   ├── users.module.ts
│   │   ├── users.controller.ts
│   │   ├── users.service.ts
│   │   └── dto/
│   │
│   ├── attendance/          # Attendance tracking
│   │   ├── attendance.module.ts
│   │   ├── attendance.controller.ts
│   │   ├── attendance.service.ts
│   │   ├── geofence.service.ts  # Haversine distance
│   │   └── dto/
│   │
│   ├── timesheets/          # Time logging
│   │   ├── timesheets.module.ts
│   │   ├── timesheets.controller.ts
│   │   ├── timesheets.service.ts
│   │   └── dto/
│   │
│   ├── leaves/              # Leave management
│   │   ├── leaves.module.ts
│   │   ├── leaves.controller.ts
│   │   ├── leaves.service.ts
│   │   └── dto/
│   │
│   ├── presence/            # Real-time presence
│   │   ├── presence.module.ts
│   │   ├── presence.service.ts
│   │   └── presence.gateway.ts  # WebSocket
│   │
│   ├── chat/                # Messaging
│   │   ├── chat.module.ts
│   │   ├── chat.controller.ts
│   │   ├── chat.service.ts
│   │   └── chat.gateway.ts      # WebSocket
│   │
│   ├── anomalies/           # Anomaly detection
│   │   ├── anomalies.module.ts
│   │   ├── anomalies.controller.ts
│   │   ├── anomalies.service.ts
│   │   └── anomaly-detection.service.ts
│   │
│   ├── admin/               # Admin operations
│   │   ├── admin.module.ts
│   │   ├── admin.controller.ts
│   │   └── admin.service.ts
│   │
│   ├── storage/             # File uploads
│   │   ├── storage.module.ts
│   │   └── storage.service.ts   # MinIO client
│   │
│   └── common/              # Shared utilities
│       ├── decorators/
│       ├── filters/
│       ├── guards/
│       ├── interceptors/
│       └── pipes/
│
├── test/                    # E2E tests
├── package.json
├── nest-cli.json
└── tsconfig.json
```

## Web Package (`apps/web/`)

```
apps/web/
├── .next/                   # Next.js build output
├── public/                  # Static assets
├── src/
│   ├── app/                 # App Router pages
│   │   ├── layout.tsx       # Root layout
│   │   ├── page.tsx         # Home page (redirect)
│   │   ├── providers.tsx    # Client providers
│   │   ├── globals.css      # Global styles
│   │   │
│   │   ├── login/
│   │   │   └── page.tsx     # Login form
│   │   │
│   │   ├── dashboard/
│   │   │   └── page.tsx     # Main dashboard
│   │   │
│   │   ├── admin/           # Admin section
│   │   │   ├── layout.tsx   # Admin layout with sidebar
│   │   │   ├── attendance/
│   │   │   │   └── page.tsx
│   │   │   ├── leaves/
│   │   │   │   └── page.tsx
│   │   │   ├── users/
│   │   │   │   └── page.tsx
│   │   │   ├── reports/
│   │   │   │   └── page.tsx
│   │   │   ├── anomalies/
│   │   │   │   └── page.tsx
│   │   │   └── settings/
│   │   │       └── page.tsx
│   │   │
│   │   ├── chat/
│   │   │   └── page.tsx
│   │   ├── leaves/
│   │   │   └── page.tsx
│   │   ├── team/
│   │   │   └── page.tsx
│   │   └── timesheets/
│   │       └── page.tsx
│   │
│   ├── components/          # Reusable components
│   │   └── ui/              # UI primitives
│   │
│   ├── hooks/               # Custom React hooks
│   │
│   ├── lib/                 # Utilities
│   │   └── api.ts           # API client
│   │
│   └── store/               # Zustand stores
│       └── auth.ts          # Auth state
│
├── tailwind.config.ts       # Tailwind with brand colors
├── next.config.js
├── package.json
└── tsconfig.json
```

## Mobile Package (`apps/mobile/`)

```
apps/mobile/
├── app/                     # Expo Router pages
│   ├── _layout.tsx          # Root layout
│   ├── index.tsx            # Entry redirect
│   ├── login.tsx            # Login screen
│   │
│   └── (tabs)/              # Tab navigator
│       ├── _layout.tsx      # Tab bar config
│       ├── index.tsx        # Dashboard (14k lines)
│       ├── timesheet.tsx    # Timesheet list
│       ├── team.tsx         # Team directory
│       └── profile.tsx      # User profile
│
├── src/
│   ├── lib/                 # Utilities
│   │   └── api.ts           # API client
│   │
│   ├── store/               # Zustand stores
│   │   └── auth.ts          # Auth with SecureStore
│   │
│   └── theme/               # Mobile theme overrides
│       └── index.ts
│
├── assets/                  # Static assets
├── app.json                 # Expo config
├── package.json
└── tsconfig.json
```

## Shared Package (`packages/shared/`)

```
packages/shared/
├── dist/                    # Build output (CJS, ESM, types)
├── src/
│   ├── index.ts             # Main export
│   │
│   ├── types/               # TypeScript types
│   │   ├── index.ts         # Re-exports
│   │   ├── enums.ts         # All enums (UserRole, WorkMode, etc.)
│   │   ├── models.ts        # Entity interfaces
│   │   └── api.ts           # API types (requests, responses)
│   │
│   └── theme/               # Design tokens
│       ├── index.ts         # Theme object export
│       ├── colors.ts        # Brand colors (Navy, Blue, Silver)
│       ├── typography.ts    # Font styles
│       ├── spacing.ts       # Spacing, shadows, borders
│       └── motion.ts        # Animation configs
│
├── package.json
└── tsconfig.json
```

## Documentation (`docs/`)

```
docs/
├── PRD.md                   # Product Requirements
├── RBAC.md                  # Role permissions matrix
├── DATA_MODEL.md            # Entity relationships
├── API_CONTRACT.md          # REST + WebSocket API
├── POLICIES.md              # Business rules
├── UX_FLOWS.md              # Screen specifications
├── ASSUMPTIONS.md           # Default values
├── BRANDING.md              # Design system
├── SECURITY.md              # Security practices
└── DEPLOYMENT.md            # Deployment guide
```

## Key File Locations

| What you're looking for | Location |
|------------------------|----------|
| Database schema | `apps/api/prisma/schema.prisma` |
| API entry point | `apps/api/src/main.ts` |
| API module config | `apps/api/src/app.module.ts` |
| Auth controller | `apps/api/src/auth/auth.controller.ts` |
| JWT guard | `apps/api/src/auth/guards/jwt-auth.guard.ts` |
| Web root layout | `apps/web/src/app/layout.tsx` |
| Web API client | `apps/web/src/lib/api.ts` |
| Web auth store | `apps/web/src/store/auth.ts` |
| Mobile root layout | `apps/mobile/app/_layout.tsx` |
| Mobile auth store | `apps/mobile/src/store/auth.ts` |
| Shared types | `packages/shared/src/types/` |
| Brand colors | `packages/shared/src/theme/colors.ts` |
| Docker services | `docker-compose.yml` |

## Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Modules | kebab-case | `attendance.module.ts` |
| Services | kebab-case | `attendance.service.ts` |
| Controllers | kebab-case | `attendance.controller.ts` |
| DTOs | kebab-case | `create-attendance.dto.ts` |
| React components | PascalCase | `AttendanceCard.tsx` |
| Hooks | camelCase with `use` | `useAttendance.ts` |
| Stores | camelCase | `auth.ts` |
| Types/Interfaces | PascalCase | `AttendanceDay` |
| Enums | PascalCase | `UserRole`, `WorkMode` |
