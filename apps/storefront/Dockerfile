# syntax=docker/dockerfile:1
FROM node:22-alpine AS base
RUN apk add --no-cache dumb-init
RUN corepack enable && corepack prepare pnpm@11.18.0 --activate
WORKDIR /app

# 1. Dependency stage with optimized layer caching
FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/customization/package.json ./packages/customization/
COPY packages/customization-react/package.json ./packages/customization-react/
COPY apps/backend/package.json ./apps/backend/
COPY apps/storefront/package.json ./apps/storefront/
RUN pnpm install --frozen-lockfile

# 2. Build stage
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages ./packages
COPY apps/backend ./apps/backend
COPY apps/storefront ./apps/storefront
RUN pnpm --filter router-cf build
RUN pnpm prune --prod

# 3. Production runtime stage
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache dumb-init

# Security: Set up ownership for non-root user
RUN chown -R node:node /app

COPY --from=builder --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/packages ./packages
COPY --from=builder --chown=node:node /app/apps/storefront ./apps/storefront
COPY --from=builder --chown=node:node /app/package.json ./package.json
COPY --from=builder --chown=node:node /app/pnpm-workspace.yaml ./pnpm-workspace.yaml

# Security: Run as non-privileged user (node:node)
USER node

WORKDIR /app/apps/storefront
EXPOSE 3000
ENV PORT=3000

# Healthcheck for container orchestration
HEALTHCHECK --interval=20s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/ || exit 1

# Performance & Reliability: dumb-init as PID 1
ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["pnpm", "start"]
