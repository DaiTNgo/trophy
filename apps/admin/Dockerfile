# syntax=docker/dockerfile:1
FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@11.18.0 --activate
WORKDIR /app

# 1. Dependency stage with optimized layer caching
FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/customization/package.json ./packages/customization/
COPY packages/customization-react/package.json ./packages/customization-react/
COPY apps/backend/package.json ./apps/backend/
COPY apps/admin/package.json ./apps/admin/
RUN pnpm install --frozen-lockfile

# 2. Build stage
FROM base AS builder
COPY --from=deps /app ./
COPY packages ./packages
COPY apps/backend ./apps/backend
COPY apps/admin ./apps/admin
RUN pnpm --filter admin build:docker

# 3. Nginx runtime stage
FROM nginx:alpine AS runner
COPY --from=builder /app/apps/admin/dist /usr/share/nginx/html
COPY apps/admin/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

# Healthcheck for container orchestration
HEALTHCHECK --interval=10s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
