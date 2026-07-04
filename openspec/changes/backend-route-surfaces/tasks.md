## 1. Route Surface Structure

- [x] 1.1 Create `apps/backend/src/routes/admin/index.ts` and mount bootstrap before the admin auth guard.
- [x] 1.2 Create `apps/backend/src/routes/storefront/index.ts` for shopper-facing routes.
- [x] 1.3 Create or keep an explicit public/system route surface for `/api/health`.
- [x] 1.4 Move admin route files under `routes/admin/` while preserving route handler behavior.
- [x] 1.5 Move storefront route files under `routes/storefront/` while preserving route handler behavior.

## 2. Auth And CORS

- [x] 2.1 Add a reusable `requireAdminSession` middleware for admin route protection.
- [x] 2.2 Apply the admin guard by default inside `routes/admin/index.ts` after `/bootstrap`.
- [x] 2.3 Keep super-admin-only account behavior intact for account management mutations.
- [x] 2.4 Update CORS policies to match `/api/admin/*` and `/api/storefront/*` route surfaces.

## 3. Endpoint Migration

- [x] 3.1 Update `apps/backend/src/app.ts` to mount `/api/admin`, `/api/storefront`, and public/system routes only.
- [x] 3.2 Remove old generic management route mounts for `/api/products`, `/api/product-metadata`, `/api/customizations`, and `/api/brand-assets`.
- [x] 3.3 Remove `/api/samples` if no real caller exists.
- [x] 3.4 Split brand asset routes into admin management endpoints and storefront runtime read endpoints.
- [x] 3.5 Split customization routes into admin editing/asset endpoints and storefront runtime endpoints.

## 4. Caller Updates

- [x] 4.1 Update admin app clients and direct fetches to use `/api/admin/*`.
- [x] 4.2 Update storefront runtime calls for brand assets/customization data to use `/api/storefront/*`.
- [x] 4.3 Search the repo for removed endpoint strings and update or delete every remaining caller.

## 5. Tests And Verification

- [x] 5.1 Add or update backend route tests for canonical admin endpoints.
- [x] 5.2 Add backend route tests proving old generic management endpoints do not route to management behavior.
- [x] 5.3 Add backend route tests for default admin auth guard and bootstrap exception.
- [x] 5.4 Add backend route tests for storefront runtime brand asset/customization reads.
- [x] 5.5 Verify admin build and backend check/build/test.
- [x] 5.6 Verify storefront typecheck/build when storefront callers change.
- [x] 5.7 Run `openspec validate backend-route-surfaces --strict`.
- [x] 5.8 Run `./init.sh`.

## 6. Documentation And State

- [x] 6.1 Update `docs/migrations/2026-07-04-backend-route-surfaces.md` if implementation changes any endpoint mapping.
- [x] 6.2 Update `openspec/changes/backend-route-surfaces/progress.md` with verification evidence.
- [x] 6.3 Update `openspec/changes/backend-route-surfaces/session-handoff.md` with restart notes and remaining work.
