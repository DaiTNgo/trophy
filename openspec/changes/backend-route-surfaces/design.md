## Context

The backend currently mounts management routes in a flat `/api` URL space such as `/api/products`, `/api/product-metadata`, `/api/customizations`, and `/api/brand-assets`, while shopper product browsing already uses `/api/storefront/products`. The route folder mirrors this mixed shape with prefixed files like `admin-accounts.ts` and `storefront-products.ts` next to generic management files.

The repository is in dev mode, so breaking route contracts and removing deprecated paths is acceptable when the current scope replaces a flow. Admin and storefront have different callers, auth expectations, response shapes, and lifecycle concerns, so route surfaces should make caller ownership explicit.

## Goals / Non-Goals

**Goals:**

- Make `/api/admin/*` the canonical operator route surface.
- Make `/api/storefront/*` the canonical shopper route surface.
- Keep `/api/health` public and unauthenticated.
- Apply admin authentication by default inside the admin route surface, with `/api/admin/bootstrap` as the explicit exception.
- Split brand assets into admin management routes and storefront runtime read routes.
- Split customization routes into admin editing/asset routes and storefront runtime routes.
- Remove old generic management endpoints without aliases.
- Update callers, CORS policies, tests, and migration docs to the new route contracts.

**Non-Goals:**

- Extracting a full products module from the large admin product route.
- Reworking product-owned customization data modeling.
- Adding compatibility redirects, aliases, or dual route support.
- Changing storefront product listing/detail response semantics except where URLs need to move for related runtime data.

## Decisions

1. Use caller-owned route surfaces instead of domain-owned top-level routes.

   Admin and storefront routes differ by caller, authorization, and safe data exposure. Mounting by caller keeps the external interface small and makes route ownership visible in `app.ts`. The rejected alternative was keeping generic domain URLs and only moving files internally, but that would leave the public contract ambiguous.

2. Put the admin guard in `routes/admin/index.ts`.

   `app.ts` should mount major surfaces, while `routes/admin/index.ts` owns admin-specific interface rules: bootstrap first, then `requireAdminSession` for all remaining admin routes. The rejected alternative was applying individual guards inside each route file, which would keep authorization knowledge scattered.

3. Remove legacy management endpoints instead of aliasing them.

   Dev mode allows breaking changes, and aliases would make the new interface weaker by allowing tests and callers to keep using the old paths. Migration documentation is the replacement for compatibility code.

4. Split brand assets by read/write intent.

   Admin routes own color/font management and uploads. Storefront routes expose shopper-safe runtime reads and font file serving. The rejected alternatives were making all brand assets public, which exposes mutation-adjacent surface area, or keeping runtime font reads under admin, which makes storefront depend on a management endpoint.

5. Keep route reshaping separate from module extraction.

   The first implementation phase should move route surfaces, URLs, guards, CORS, callers, tests, and docs while preserving behavior. A later phase can extract deep product/customization modules once the external interface is stable.

## Risks / Trade-offs

- **Risk: Admin callers miss one URL update** -> Mitigation: search for old endpoint strings, add tests for 404 on removed paths, and run admin build/type checks.
- **Risk: Admin guard blocks bootstrap or auth flows** -> Mitigation: mount bootstrap before the guard and cover it with a route test.
- **Risk: Storefront runtime accidentally calls admin endpoints** -> Mitigation: expose storefront read routes for brand assets/customization runtime and search storefront code for `/api/admin`.
- **Risk: CORS policy order changes behavior** -> Mitigation: update route-surface CORS patterns and verify preflight/admin/storefront requests.
- **Trade-off: Product route remains large after phase one** -> Accepted because shrinking implementation internals during the URL/auth migration would increase blast radius.

## Migration Plan

1. Create route surface indexes for admin, storefront, and public/system routes.
2. Move existing route files under the new surface folders while preserving route handler behavior.
3. Add `requireAdminSession` middleware to the admin surface after bootstrap.
4. Update `app.ts` and CORS patterns to mount only canonical surfaces.
5. Update admin and storefront callers to the new URLs.
6. Add/update tests for canonical endpoints, admin auth, removed old endpoints, and public health.
7. Keep `docs/migrations/2026-07-04-backend-route-surfaces.md` as the migration map.

Rollback is not a runtime compatibility path. If the change must be reverted during development, revert the route mount/caller changes together.

## Open Questions

None.
