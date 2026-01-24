# Technology Stack

**Mapped:** 2026-01-24

## Overview

Satcom Workforce is a TypeScript monorepo with three applications (API, Web, Mobile) and a shared package. Uses npm workspaces for dependency management.

## Languages & Runtimes

| Component | Language | Runtime |
|-----------|----------|---------|
| All code | TypeScript 5.3 | Node.js 20+ |
| Web | TypeScript + JSX | Next.js 14 |
| Mobile | TypeScript + JSX | Expo SDK 52 / React Native 0.76 |
| API | TypeScript | NestJS 10 |

## Package Manager

**npm** with workspaces (defined in root `package.json`)

```json
"workspaces": ["packages/*", "apps/*"]
```

Key scripts in root:
- `npm run dev` - Start all apps in parallel
- `npm run dev:api` - Start API only
- `npm run dev:web` - Start web only
- `npm run build` - Build all packages
- `npm run db:migrate` - Run Prisma migrations
- `npm run db:seed` - Seed database

## Backend Stack (`apps/api`)

### Framework

**NestJS 10.3** - Modular Node.js framework

Key NestJS packages:
- `@nestjs/config` - Environment configuration
- `@nestjs/jwt` - JWT authentication
- `@nestjs/passport` - Auth strategies
- `@nestjs/swagger` - API documentation
- `@nestjs/throttler` - Rate limiting
- `@nestjs/schedule` - Cron jobs
- `@nestjs/websockets` + `@nestjs/platform-socket.io` - Real-time

### Database

**PostgreSQL 16** via Docker

**Prisma 5.8** - ORM and migrations
- Schema: `apps/api/prisma/schema.prisma`
- Migrations: `apps/api/prisma/migrations/`

### Authentication

- `passport` + `passport-jwt` - JWT strategy
- `bcrypt` - Password hashing
- Custom OTP verification for new devices

### Real-time

**Socket.IO 4.6** for:
- Presence tracking (online/away/offline)
- Chat messaging

### File Storage

**MinIO** - S3-compatible object storage
- Client: `minio` npm package

### Email

**Nodemailer** for transactional emails
- Dev: MailHog SMTP server

### Validation

- `class-validator` - DTO validation
- `class-transformer` - Object transformation

## Web Stack (`apps/web`)

### Framework

**Next.js 14.1** with App Router
- Server components
- Client components with `'use client'`
- Route handlers for API proxying (if needed)

### Styling

**Tailwind CSS 3.4** with:
- Custom Satcom brand colors from shared theme
- `tailwind-merge` for className merging
- `class-variance-authority` for variant patterns
- `clsx` for conditional classes

### State Management

- **Zustand 4.4** - Client state (auth, UI)
- **TanStack Query 5.17** - Server state, caching

### UI Components

- **Lucide React** - Icons
- **Framer Motion 10.18** - Animations

### Real-time

**socket.io-client** for WebSocket connections

### Date Handling

**date-fns 3.2** for date formatting/manipulation

### Testing

**Playwright** for E2E tests

## Mobile Stack (`apps/mobile`)

### Framework

**Expo SDK 52** with managed workflow
- **React Native 0.76**
- **Expo Router 4** - File-based routing

### Navigation

- `expo-router` - File-based navigation
- `@react-navigation/native` - Navigation primitives

### Key Expo Packages

| Package | Purpose |
|---------|---------|
| `expo-secure-store` | Secure token storage |
| `expo-location` | GPS for geofence check-in |
| `expo-image` | Optimized image loading |
| `expo-haptics` | Haptic feedback |
| `expo-linear-gradient` | Gradient backgrounds |
| `expo-font` | Custom fonts |
| `expo-splash-screen` | Splash screen control |

### Animations

**React Native Reanimated 3.16** for performant animations

### Gestures

- `react-native-gesture-handler` - Touch gestures
- `@egjs/hammerjs` (via deps) - Gesture recognition

### State Management

Same as web:
- **Zustand 4.5** (with SecureStore persistence)
- **TanStack Query 5.40**

### Real-time

**socket.io-client** for WebSocket connections

## Shared Package (`packages/shared`)

### Build Tool

**tsup 8** - TypeScript bundler
- Outputs: CJS, ESM, TypeScript declarations
- Entry points: `src/index.ts`, `src/theme/index.ts`

### Exports

```typescript
// Types
export * from './types/enums';
export * from './types/models';
export * from './types/api';

// Theme
export * from './theme/colors';
export * from './theme/typography';
export * from './theme/spacing';
export * from './theme/motion';
```

## Infrastructure (Docker Compose)

| Service | Image | Ports |
|---------|-------|-------|
| PostgreSQL | `postgres:16-alpine` | 5432 |
| MinIO | `minio/minio:latest` | 9000, 9001 |
| MailHog | `mailhog/mailhog:latest` | 1025, 8025 |

## Development Tools

| Tool | Version | Purpose |
|------|---------|---------|
| TypeScript | 5.3.3 | Type checking |
| ESLint | 8.56 | Linting |
| Prettier | 3.2.4 | Code formatting |
| Jest | 29.7 | Unit testing (API) |
| Playwright | 1.41 | E2E testing (Web) |

## Configuration Files

| File | Purpose |
|------|---------|
| `tsconfig.base.json` | Shared TypeScript config |
| `.prettierrc` | Prettier config |
| `docker-compose.yml` | Local infrastructure |
| `apps/api/nest-cli.json` | NestJS CLI config |
| `apps/web/tailwind.config.ts` | Tailwind with brand tokens |
| `apps/mobile/app.json` | Expo configuration |

## Version Requirements

- Node.js: 20.x+
- npm: 10.x+
- Docker: 24.x+
- PostgreSQL: 16.x
