# Trophy monorepo

pnpm workspace monorepo with three apps, one shared package, and Docker containerization.

## Apps & package name mapping

Use `pnpm --filter <name>` — the filter name is the `package.json` `name`, not the directory.

| Directory | Filter name | Type | Dev port | Production / Docker |
|---|---|---|---|---|
| `apps/backend` | `backend` | Hono + Node.js server (`@hono/node-server`) | 8787 | Container (`backend:8787`) |
| `apps/admin` | `admin` | React SPA (React Router + `@medusajs/ui`) | 5174 | Nginx container (`admin:80`) |
| `apps/storefront` | `router-cf` | React Router framework SSR + Node.js (`@react-router/serve`) | 5173 | Container (`storefront:3000`) |
| `packages/customization` | `customization` | Shared types/validation (`@trophy/customization`) | — | Shared workspace package |

## Architecture & Docker

The repository has migrated from Cloudflare serverless (Workers, D1 SQLite, R2) to self-hosted Docker + PostgreSQL:

- **Database**: PostgreSQL 16 Alpine managed via Drizzle ORM (`drizzle-orm/pg-core` + `postgres-js`).
- **Object Storage**: Local filesystem disk volume with an R2-compatible interface (`LocalStorageAdapter` in `apps/backend/src/lib/storage.ts`).
- **Reverse Proxy Gateway**: Nginx on ports 80/443 (`docker/nginx/nginx.conf`) routing subdomains (`admin.*`, `api.*`) and subpaths (`/admin`, `/api`, `/fonts`, `/`).
- **Security & Hardening**: Non-root container users (`node:1000`), loopback-only 127.0.0.1 DB port, `dumb-init` PID 1, Nginx rate limits on auth and API, anti-slowloris timeouts, anti-path-traversal.

## Quick start

```bash
./init.sh   # pnpm install + build/typecheck all apps
```

### Development Workflows

**1. Hybrid Dev (Recommended for coding):**
Run PostgreSQL in Docker while running apps on host for fast HMR:
```bash
docker compose up -d db
pnpm dev
```

**2. Full Stack in Docker (Production mirror):**
```bash
cp .env.example .env
docker compose up -d --build
```

### Individual checks:

```bash
pnpm --filter backend build       # vite build (Node SSR bundle)
pnpm --filter backend check       # tsc --noEmit
pnpm --filter backend test        # vitest API/service tests
pnpm --filter admin build         # tsc -b && vp build (uses Vite+ CLI)
pnpm --filter router-cf build     # react-router build
pnpm --filter router-cf typecheck # react-router typegen + tsc -b
pnpm --filter customization test  # vitest run
```

## CORS

Backend uses custom CORS middleware (not `@hono/cors`). Local origins `localhost:5173`, `127.0.0.1:5173`, `localhost:5174`, `127.0.0.1:5174`, port 80/443, and preview ports are supported. The `ADMIN_APP_ORIGIN` and `STOREFRONT_APP_ORIGIN` env vars configure additional production domains/origins.

To test admin login against the local backend, run the backend dev server first. Admin is served by Vite on its fixed port (`5174`) and backend on `8787` for credentialed requests to work.

## Auth

Better Auth with PostgreSQL. Two roles: `super-admin` (can manage accounts) and `admin` (day-to-day). Username + password login. First admin created via seed script or onboarding endpoint.

```bash
pnpm --filter backend seed:admin -- --username=admin --password=YourSecurePassword123!
```

The script connects to PostgreSQL via `DATABASE_URL` (or POSTs to `POST /api/admin/bootstrap` on the local backend with `ADMIN_SEED_SECRET`). The admin app's onboarding UI also uses the bootstrap endpoint for first-time setup when no users exist.

## Data

Drizzle ORM + PostgreSQL. Schema lives in `apps/backend/src/db/schema.ts`.
Database client and compatibility layer live in `apps/backend/src/db/client.ts`.

This repository is currently in **dev mode** for agent work:

- Do not preserve deprecated code paths just for compatibility.
- Do not add or maintain migrations unless the user explicitly asks for them.
- If a model or flow is replaced in the current scope, delete the old unused code instead of keeping both.
- Prefer the clean current contract over transition layers.

## UI conventions

- **Admin** (`apps/admin`): light theme only. Use Medusa-style components from `src/components/ui/medusa/` for layout/forms. Use `@medusajs/ui` (FocusModal, Heading, Text, Button, Input, etc.) for complex UIs. Import `cn()` from `src/lib/utils`.
- **Storefront** (`apps/storefront`): shadcn/ui from `app/components/ui/`. Import `cn()` from `app/lib/utils`. Use route loaders/actions over client-only fetching.

## Session startup

1. If the work lives under `openspec/changes/<change>/`, read that change's `proposal.md`, `design.md`, `specs/`, `tasks.md`, and any local `progress.md` / `session-handoff.md` first.
2. If the work is not OpenSpec-driven, read `feature_list.json`, `progress.md`, `session-handoff.md`.
3. `git log --oneline -5` to see recent changes.
4. If baseline `./init.sh` is failing, fix it before adding new scope.

## Working rules

- For non-OpenSpec work, pick exactly one unfinished item from `feature_list.json`.
- For OpenSpec work, the unit of ownership is one change folder. Parallel OpenSpec changes may proceed independently if they do not share files or ownership boundaries.
- Stay in scope: do not refactor unrelated apps while working on one feature or change.
- Dev mode cleanup is allowed inside the active feature: remove dead code, deprecated paths, and unused compatibility shims when replacing a flow.
- Preserve app boundaries:
  - `backend` owns API routes, business logic, storage adapter, and PostgreSQL database operations.
  - `admin` owns operator flows; must not depend on storefront route code.
  - `storefront` owns shopper routes, loaders, actions, and SSR (`BACKEND_INTERNAL_URL` for internal Docker requests).
- Update the active state files at end of session. For OpenSpec work, update the change-local `tasks.md`, `progress.md`, and `session-handoff.md` inside the change folder. For non-OpenSpec work, update `feature_list.json`, `progress.md`, and `session-handoff.md` at the repo root.
- Leave the repo restartable: next session must be able to run `./init.sh` cleanly.

## Dependency licensing

- Only add dependencies with permissive/OSI licenses: MIT, Apache-2.0, BSD-2/3-Clause, ISC, Unlicense.
- Never add libraries that require a paid/commercial license for production use, including source-available-with-use-restrictions licenses (BUSL 1.1, FSL, SSPL).
- Known trap in this repo: Tiptap OSS core (`@tiptap/*`, MIT — already installed, fine) is separate from Tiptap's paid Cloud extension packs (Collaboration, Comments, AI Toolkit, DOCX/MD Conversion). Do not add `@tiptap/extension-collaboration`, `@tiptap/extension-comments`, AI toolkit, or `@tiptap/extension-conversion`-style add-ons without user approval.
- Before adding a new dependency, verify its license: `npm view <pkg> license` (or check the installed package's `license` field / `LICENSE` file). Do not guess from the name or README.
- If a license is unclear, dual/commercial, or the package is a paid add-on of a free base library, stop and ask the user before installing. Never add a questionable dependency silently.

## Editing guidance

- New API work → `apps/backend/src/routes/`.
- New backend route contracts consumed by admin or storefront must use Hono RPC as the default integration path: export the relevant route/app type from backend, create typed clients with `hc<AppType>()`, and avoid new hand-written fetch wrappers unless there is a documented blocker.
- Hono RPC routes must return explicit typed JSON responses with `c.json(payload, status)` for success and error cases; do not use untyped `c.notFound()` for client-consumed not-found responses.
- New admin screens → add React Router route in `App.tsx`.
- Storefront changes → prefer route loaders/actions over client-only fetching. Internal SSR fetches use `BACKEND_INTERNAL_URL` via `apps/storefront/app/lib/backend-fetch.server.ts`.
- Deployment & container configs → `docker-compose.yml`, `docker/nginx/nginx.conf`, `apps/*/Dockerfile`.

Ask the user before: inventing business rules not in code, changing contracts across multiple apps, or when database environments / secrets are ambiguous.

## Definition of Done

A feature is done only when all of the following are true:

- [ ] Target behavior is implemented in the correct app.
- [ ] Relevant verification actually ran (`./init.sh`, package checks).
- [ ] Evidence is recorded in `feature_list.json` and `progress.md`.
- [ ] The repository is restartable from `./init.sh`.

Backend API work has additional done criteria:

- [ ] Every new or changed backend route has API contract coverage at the public route surface used by admin or storefront, normally through Hono `app.request(...)`.
- [ ] New admin/storefront consumers use Hono RPC (`hc<AppType>()`) against exported backend route/app types, with any exception documented in `progress.md` and the active feature evidence.
- [ ] API contract tests cover the successful response shape plus the important failure modes for that route: validation errors, not found cases, auth/session/role checks, and shopper-safe vs admin-only data boundaries when applicable.
- [ ] Business rules behind the route are covered by service/helper unit tests when the logic is non-trivial, so API tests stay focused on the HTTP contract.
- [ ] Test names describe observable behavior in project language from `CONTEXT.md` and assert known-good literals or worked examples, not implementation details.
- [ ] Backend verification includes `pnpm --filter backend test`, `pnpm --filter backend check`, and `pnpm --filter backend build`; `./init.sh` must pass before claiming the feature done.
- [ ] If a backend change intentionally does not add or update tests, the reason and residual risk must be recorded in `progress.md` and the active feature evidence.

Do not treat migration authoring, deprecated-path compatibility, or dual-model support as part of done unless the user explicitly requests them.

## Required Artifacts

- `feature_list.json` — repo-level fallback index for non-OpenSpec work and cross-change coordination.
- `progress.md` — repo-level fallback state for non-OpenSpec work.
- `session-handoff.md` — repo-level fallback restart notes for non-OpenSpec work.
- `init.sh` — standard verification entrypoint.

## OpenSpec Changes

- Treat each folder under `openspec/changes/<change>/` as an independent unit of work.
- Create `progress.md` and `session-handoff.md` inside the change folder if they do not already exist.
- Keep task progress inside that change's `tasks.md`; do not use the root state files as the source of truth for OpenSpec work.
- When multiple OpenSpec changes are active, keep their state isolated unless a task explicitly spans both folders.

## End of Session

1. Update `progress.md` with current state and next step.
2. Update `feature_list.json` status and evidence.
3. Record blockers, risks, and any open assumptions.
4. Update `session-handoff.md` if work spans sessions.
5. Leave the repo clean enough for `./init.sh` to pass.

## Caveats

- `apps/backend`'s `studio` script has a typo in package.json (`dizzle-kit studio` instead of `drizzle-kit studio`) — use `db:generate` instead for schema pushes.
- No CI/CD workflows exist yet (no `.github/workflows/`).
- Placeholder-only admin routes (Inventory, Customers, Promotions, Price Lists, Collections, Categories) exist as routes but are not shown in the sidebar. Only real features (Orders, Products, Customization, Team, Settings) are exposed.
- Admin product catalog and order data are currently mock-first (browser-local state), not backend-backed.
