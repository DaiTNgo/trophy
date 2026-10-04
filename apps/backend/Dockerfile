# syntax=docker/dockerfile:1
FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@11.18.0 --activate
WORKDIR /app

# 1. Dependency stage with layer caching
FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json .npmrc* ./
COPY packages/customization/package.json ./packages/customization/
COPY apps/backend/package.json ./apps/backend/
RUN pnpm install --frozen-lockfile

# 2. Build & Deploy stage
FROM base AS builder
COPY --from=deps /app ./
COPY packages ./packages
COPY apps/backend ./apps/backend

# Build the backend application (Vite SSR build -> dist/backend/index.js)
RUN pnpm --filter backend build

# Isolate production package using pnpm deploy
RUN pnpm --filter backend --prod --legacy deploy /prod/backend

# Copy the built dist output into the deployed isolated directory
RUN cp -r /app/apps/backend/dist /prod/backend/dist

# 3. Production runtime stage
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache dumb-init

# Prepare directories for app and storage with proper non-root permissions
RUN mkdir -p /app/apps/backend/storage && chown -R node:node /app

# Copy deployed backend code and dependencies
COPY --from=builder --chown=node:node /prod/backend /app

USER node

EXPOSE 8787
ENV PORT=8787
ENV STORAGE_DIR=/app/storage

# Healthcheck for container orchestration
HEALTHCHECK --interval=20s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:8787/api/health || exit 1

# Performance & Reliability: dumb-init as PID 1
ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["node", "dist/backend/index.js"]

