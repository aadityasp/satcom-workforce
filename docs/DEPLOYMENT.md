# Deployment Guide

## Overview

This guide covers deploying the Satcom Workforce application stack:
- NestJS API (Backend)
- Next.js Web App (Frontend)
- Expo Mobile App (iOS/Android)
- PostgreSQL Database
- MinIO Object Storage

## Prerequisites

- Docker & Docker Compose
- Node.js 20+ (for builds)
- pnpm 8+
- AWS CLI or compatible cloud CLI (for production)

## Local Development

### Quick Start

```bash
# Clone and install
git clone <repo-url>
cd satcom_employeetracker
pnpm install

# Start infrastructure
docker compose up -d

# Run database migrations
pnpm --filter @satcom/api prisma migrate dev

# Seed demo data
pnpm --filter @satcom/api prisma db seed

# Start all services in development mode
pnpm dev
```

### Environment Setup

Create `.env` files for each app:

**apps/api/.env**
```env
NODE_ENV=development
PORT=3001
DATABASE_URL=postgresql://satcom:satcom_dev@localhost:5432/satcom_workforce
JWT_SECRET=your-jwt-secret-min-32-chars
JWT_REFRESH_SECRET=your-refresh-secret-min-32-chars
JWT_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=satcom-uploads
CORS_ORIGINS=http://localhost:3000
```

**apps/web/.env.local**
```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
NEXT_PUBLIC_WS_URL=ws://localhost:3001
```

**apps/mobile/.env**
```env
EXPO_PUBLIC_API_URL=http://localhost:3001/api/v1
EXPO_PUBLIC_WS_URL=ws://localhost:3001
```

## Docker Compose (Development)

```yaml
# docker-compose.yml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: satcom
      POSTGRES_PASSWORD: satcom_dev
      POSTGRES_DB: satcom_workforce
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  minio:
    image: minio/minio
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    ports:
      - "9000:9000"
      - "9001:9001"
    volumes:
      - minio_data:/data

  mailhog:
    image: mailhog/mailhog
    ports:
      - "1025:1025"
      - "8025:8025"

volumes:
  postgres_data:
  minio_data:
```

## Production Deployment

### Architecture Recommendations

```
                    ┌─────────────┐
                    │   CDN/WAF   │
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │ Load Balancer│
                    └──────┬──────┘
                           │
           ┌───────────────┼───────────────┐
           │               │               │
    ┌──────▼──────┐ ┌──────▼──────┐ ┌──────▼──────┐
    │  Web App    │ │  API (x3)   │ │  WebSocket  │
    │  (Vercel)   │ │ (Container) │ │  (Sticky)   │
    └─────────────┘ └──────┬──────┘ └──────┬──────┘
                           │               │
                    ┌──────▼───────────────▼──────┐
                    │         Redis Cluster       │
                    │     (Sessions & Caching)    │
                    └──────────────┬──────────────┘
                                   │
                    ┌──────────────▼──────────────┐
                    │   PostgreSQL (Primary +     │
                    │        Read Replicas)       │
                    └──────────────┬──────────────┘
                                   │
                    ┌──────────────▼──────────────┐
                    │     S3 / MinIO Cluster      │
                    └─────────────────────────────┘
```

### API Deployment (Docker)

**Dockerfile.api**
```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared/package.json ./packages/shared/
RUN npm install -g pnpm && pnpm install --frozen-lockfile
COPY . .
RUN pnpm --filter @satcom/api build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/api/node_modules ./node_modules
COPY --from=builder /app/apps/api/package.json ./
EXPOSE 3001
CMD ["node", "dist/main.js"]
```

### Web Deployment (Vercel)

```json
// vercel.json
{
  "buildCommand": "pnpm --filter @satcom/web build",
  "outputDirectory": "apps/web/.next",
  "framework": "nextjs",
  "env": {
    "NEXT_PUBLIC_API_URL": "@api_url",
    "NEXT_PUBLIC_WS_URL": "@ws_url"
  }
}
```

### Mobile Deployment (EAS)

```json
// apps/mobile/eas.json
{
  "cli": { "version": ">= 5.0.0" },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "env": {
        "EXPO_PUBLIC_API_URL": "https://api-staging.satcom.com/api/v1"
      }
    },
    "production": {
      "env": {
        "EXPO_PUBLIC_API_URL": "https://api.satcom.com/api/v1"
      }
    }
  },
  "submit": {
    "production": {}
  }
}
```

Build commands:
```bash
# iOS build
eas build --platform ios --profile production

# Android build
eas build --platform android --profile production

# Submit to stores
eas submit --platform ios
eas submit --platform android
```

## Database Migrations

### Development

```bash
# Create migration
pnpm --filter @satcom/api prisma migrate dev --name <migration_name>

# Reset database (DESTRUCTIVE)
pnpm --filter @satcom/api prisma migrate reset
```

### Production

```bash
# Deploy migrations (non-interactive)
pnpm --filter @satcom/api prisma migrate deploy

# Generate client
pnpm --filter @satcom/api prisma generate
```

## CI/CD Pipeline

### GitHub Actions Example

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
        with:
          version: 8
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install
      - run: pnpm lint
      - run: pnpm typecheck
      - run: pnpm test

  deploy-api:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Build and push Docker image
        run: |
          docker build -f Dockerfile.api -t satcom-api:${{ github.sha }} .
          # Push to container registry
      - name: Deploy to Kubernetes
        run: |
          kubectl set image deployment/api api=satcom-api:${{ github.sha }}

  deploy-web:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: --prod
```

## Monitoring & Observability

### Logging

Configure structured logging:
```typescript
// API logging configuration
{
  level: process.env.LOG_LEVEL || 'info',
  format: process.env.NODE_ENV === 'production' ? 'json' : 'pretty',
  transports: ['console', 'file'],
}
```

### Health Checks

API health endpoint: `GET /health`
```json
{
  "status": "healthy",
  "timestamp": "2026-01-19T10:00:00Z",
  "services": {
    "database": "connected",
    "redis": "connected",
    "minio": "connected"
  }
}
```

### Metrics

Expose Prometheus metrics at `/metrics`:
- HTTP request duration
- Active connections
- Database pool usage
- Memory/CPU usage

### Alerting Rules

| Metric | Threshold | Action |
|--------|-----------|--------|
| Error Rate | > 1% | Alert |
| Response Time P95 | > 2s | Warning |
| Database Connections | > 80% | Alert |
| Memory Usage | > 85% | Alert |

## Scaling Guidelines

### Horizontal Scaling

- API: Stateless, scale based on CPU/memory
- WebSocket: Sticky sessions required, scale with connection count
- Database: Read replicas for queries, primary for writes

### Recommended Resources

| Service | Min | Recommended |
|---------|-----|-------------|
| API | 0.5 CPU, 512MB | 2 CPU, 2GB |
| Web | Vercel Serverless | - |
| PostgreSQL | 1 CPU, 2GB | 4 CPU, 8GB |
| Redis | 0.5 CPU, 512MB | 1 CPU, 2GB |

## Backup & Recovery

### Database Backups

```bash
# Daily automated backup
pg_dump -Fc satcom_workforce > backup_$(date +%Y%m%d).dump

# Restore
pg_restore -d satcom_workforce backup_20260119.dump
```

### Object Storage

- Enable versioning on S3/MinIO bucket
- Cross-region replication for DR
- Lifecycle policies for cost optimization

## Rollback Procedures

### API Rollback

```bash
# Kubernetes
kubectl rollout undo deployment/api

# Docker Compose
docker compose pull
docker compose up -d --force-recreate
```

### Database Rollback

```bash
# Revert last migration
pnpm --filter @satcom/api prisma migrate resolve --rolled-back <migration_name>
```

## Troubleshooting

### Common Issues

1. **Database Connection Errors**
   - Check connection string
   - Verify network/firewall rules
   - Check connection pool exhaustion

2. **WebSocket Disconnections**
   - Verify sticky sessions
   - Check load balancer timeout settings
   - Verify JWT token refresh

3. **File Upload Failures**
   - Check MinIO connectivity
   - Verify bucket permissions
   - Check file size limits

### Debug Mode

```bash
# Enable debug logging
DEBUG=* pnpm --filter @satcom/api start:dev
```
