## Why

Backend management routes currently mix caller ownership in a mostly flat route folder and URL space. This makes admin-only behavior look like generic product/customization APIs, weakens auth expectations, and leaves storefront runtime calls too close to operator management endpoints.

## What Changes

- **BREAKING** Move operator-facing backend endpoints to `/api/admin/*`.
- **BREAKING** Remove old generic management endpoint contracts instead of keeping aliases or redirects.
- Add an admin route surface with a default admin-session guard, while keeping `/api/admin/bootstrap` as the explicit unauthenticated onboarding exception.
- Keep shopper-facing product browsing under `/api/storefront/products`.
- Split brand asset access into admin-only management endpoints and storefront-safe runtime read endpoints.
- Split customization access by lifecycle: admin editing/validation/assets vs storefront published runtime.
- Keep `/api/health` public and unauthenticated.
- Remove `/api/samples` if it has no real caller.
- Add migration documentation mapping removed endpoints to canonical replacements.

## Capabilities

### New Capabilities

- `backend-route-surfaces`: Defines caller-owned backend route surfaces for admin, storefront, and public/system endpoints, including auth expectations and migration behavior.

### Modified Capabilities

None.

## Impact

- Backend route mounting in `apps/backend/src/app.ts`.
- Backend route organization under `apps/backend/src/routes/`.
- Admin app backend client URLs and any direct fetch paths.
- Storefront runtime calls for brand assets or customization data.
- Backend CORS policy paths for admin and storefront route surfaces.
- Route tests for admin auth, removed legacy endpoints, storefront read access, and public health.
- Documentation in `docs/migrations/2026-07-04-backend-route-surfaces.md`.
