# ============================================
# Satcom Workforce Web - Production Dockerfile
# ============================================

# ---------------------------------------------------------
# Stage 1: Dependencies
# ---------------------------------------------------------
FROM node:20-alpine AS deps
WORKDIR /app

# Copy package files (all workspaces needed for npm ci to resolve lockfile)
COPY package.json package-lock.json* ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
COPY apps/mobile/package.json ./apps/mobile/
COPY packages/shared/package.json ./packages/shared/

# Install dependencies
RUN npm ci --include=dev

# ---------------------------------------------------------
# Stage 2: Builder
# ---------------------------------------------------------
FROM node:20-alpine AS builder
WORKDIR /app

# Copy dependencies from deps stage (workspaces hoist to root node_modules)
COPY --from=deps /app/node_modules ./node_modules

# Copy source code
COPY . .

# Set build-time env vars (NEXT_PUBLIC_* are inlined at build time)
ARG NEXT_PUBLIC_API_URL=http://localhost:3003/api/v1
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

# Build the application
RUN cd apps/web && npm run build

# ---------------------------------------------------------
# Stage 3: Production
# ---------------------------------------------------------
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Install production dependencies
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built application (monorepo standalone outputs to nested path)
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/public ./apps/web/public

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)}).on('error', () => process.exit(1))"

# Start the application
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "apps/web/server.js"]
