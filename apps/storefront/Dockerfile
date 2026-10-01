# syntax=docker/dockerfile:1
FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@11.18.0 --activate
WORKDIR /app

# 1. Dependency stage with layer caching
FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json .npmrc* ./
COPY packages/customization/package.json ./packages/customization/
COPY packages/customization-react/package.json ./packages/customization-react/
COPY apps/backend/package.json ./apps/backend/
COPY apps/storefront/package.json ./apps/storefront/
RUN pnpm install --frozen-lockfile

# 2. Build & Deploy stage
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json .npmrc* ./
COPY packages ./packages
COPY apps/backend ./apps/backend
COPY apps/storefront ./apps/storefront

# Build the storefront app
RUN pnpm --filter router-cf build

# Isolate production package using pnpm deploy
RUN pnpm --filter router-cf --prod --legacy deploy /prod/storefront

# Copy the built SSR assets into the deployed isolated directory
RUN cp -r /app/apps/storefront/build /prod/storefront/build

# 3. Production runtime stage
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache dumb-init

# Security: non-root user setup
COPY --from=builder --chown=node:node /prod/storefront /app

USER node

EXPOSE 3000
ENV PORT=3000

# Healthcheck
HEALTHCHECK --interval=20s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3000/ || exit 1

# Performance & Reliability: dumb-init as PID 1
ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["node", "./node_modules/@react-router/serve/dist/cli.js", "./build/server/index.js"]

