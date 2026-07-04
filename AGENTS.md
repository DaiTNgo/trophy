# Trophy monorepo

pnpm workspace monorepo with three apps and one shared package.

## Apps & package name mapping

Use `pnpm --filter <name>` — the filter name is the `package.json` `name`, not the directory.

| Directory | Filter name | Type | Dev port | Preview port |
|---|---|---|---|---|
| `apps/backend` | `backend` | Hono + Cloudflare Worker | 8787 | 8788 |
| `apps/admin` | `admin` | React SPA (React Router + `@medusajs/ui`) | 5174 | 4174 |
| `apps/storefront` | `router-cf` | React Router framework SSR + Cloudflare Worker | 5173 | 4173 |
| `packages/customization` | `customization` | Shared types/validation (`@trophy/customization`) | — | — |

## Quick start

```bash
./init.sh   # pnpm install + build/typecheck all apps
```

Individual checks:

```bash
pnpm --filter backend build       # vite build
pnpm --filter backend check       # tsc --noEmit
pnpm --filter backend test        # vitest API/service tests
pnpm --filter admin build         # tsc -b && vp build (uses Vite+ CLI)
pnpm --filter router-cf build     # react-router build
pnpm --filter router-cf typecheck # wrangler types + react-router typegen + tsc -b
pnpm --filter customization test  # vitest run
```

`apps/storefront` runs `wrangler types` on `postinstall` — do not remove it.

## CORS

Backend uses custom CORS middleware (not `@hono/cors`). Local origins `localhost:5173`, `127.0.0.1:5173`, `localhost:5174`, `127.0.0.1:5174` and their preview ports are always allowed. The `ADMIN_APP_ORIGIN` and `STOREFRONT_APP_ORIGIN` env vars add additional origins.

To test admin login against the local backend, run the backend dev server first. Admin must be served by Vite on its fixed port (`5174`) and backend on `8787` for credentialed requests to work.

## Auth

Better Auth with D1. Two roles: `super-admin` (can manage accounts) and `admin` (day-to-day). Username + password login. First admin created via seed script.

```bash
pnpm --filter backend seed:admin -- --username=admin
```

The script POSTs to `POST /api/admin/bootstrap` on the local backend. On loopback URLs the default bootstrap secret `trophy-local-bootstrap` is used automatically. Use `--url` for a different target or `--secret` / `ADMIN_SEED_SECRET` for a custom secret in production. The admin app's onboarding UI also uses this endpoint for the first-time setup when no users exist.
The CLI seed flow writes directly to D1 via `wrangler d1 execute`. Use `--username` and `--password`, with optional `--target=local|remote`. Keep the HTTP bootstrap endpoint only for the admin app onboarding flow.

## Data

Drizzle ORM + Cloudflare D1 (SQLite). Schema lives in `apps/backend/src/db/schema.ts`.

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
  - `backend` owns API routes, business logic, and Cloudflare bindings.
  - `admin` owns operator flows; must not depend on storefront route code.
  - `storefront` owns shopper routes, loaders, actions, and SSR.
- Update the active state files at end of session. For OpenSpec work, update the change-local `tasks.md`, `progress.md`, and `session-handoff.md` inside the change folder. For non-OpenSpec work, update `feature_list.json`, `progress.md`, and `session-handoff.md` at the repo root.
- Leave the repo restartable: next session must be able to run `./init.sh` cleanly.

## Editing guidance

- New API work → `apps/backend/src/routes/`.
- New backend route contracts consumed by admin or storefront must use Hono RPC as the default integration path: export the relevant route/app type from backend, create typed clients with `hc<AppType>()`, and avoid new hand-written fetch wrappers unless there is a documented blocker.
- Hono RPC routes must return explicit typed JSON responses with `c.json(payload, status)` for success and error cases; do not use untyped `c.notFound()` for client-consumed not-found responses.
- New admin screens → add React Router route in `App.tsx`.
- Storefront changes → prefer route loaders/actions over client-only fetching.
- Cloudflare config → `apps/*/wrangler.jsonc`.

Ask the user before: inventing business rules not in code, changing contracts across multiple apps, or when Cloudflare bindings/secrets/D1 environments are ambiguous.

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
- The repo's `README.md` is the default Turborepo starter template and does not reflect actual project structure. Ignore it. Use `apps/*/README.md` per-app docs instead.
- Placeholder-only admin routes (Inventory, Customers, Promotions, Price Lists, Collections, Categories) exist as routes but are not shown in the sidebar. Only real features (Orders, Products, Customization, Team, Settings) are exposed.
- Admin product catalog and order data are currently mock-first (browser-local state), not backend-backed.
