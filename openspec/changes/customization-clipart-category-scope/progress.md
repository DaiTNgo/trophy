## 2026-07-09

Implemented the clipart category-scope change across shared customization logic, admin authoring/preview, storefront selection, and storefront-safe backend serialization.

Completed:
- Replaced authoring-time clipart asset allow-list/default-asset fields with `clipartCategoryMode`, `clipartCategory`, and `allowedClipartCategories` in `packages/customization`.
- Updated shared validation and runtime/design helpers so clipart layers no longer require persisted defaults and validate category scope instead.
- Reworked the admin inspector to author `Fixed category` vs `Allowed categories`.
- Updated admin preview and storefront product customization UI to derive clipart options from category scope using UI-local initial state.
- Updated storefront-safe backend customization serialization to derive active clipart assets from the backend clipart library for referenced categories.
- Updated shared/admin/backend storefront tests to cover the new category-scope behavior.

Verification:
- `pnpm --filter customization test`
- `pnpm --filter admin test`
- `pnpm --filter admin build`
- `pnpm --filter router-cf test`
- `pnpm --filter router-cf build`
- `pnpm --filter backend test -- src/routes/storefront/products.test.ts src/routes/storefront/orders.test.ts`
- `pnpm --filter backend check`
- `pnpm --filter backend build`
- `./init.sh`

Notes:
- Storefront/admin clipart initial selection is now UI-local rather than persisted in the template. The template starts with `null` for clipart field values until the shopper/operator selects a clipart asset.
