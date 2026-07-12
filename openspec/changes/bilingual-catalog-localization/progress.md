## Update: Product title requires Vietnamese only
- Changed backend publish validation so product title requires Vietnamese (`vi`) text only. Missing English (`en`) product title no longer blocks publish by itself.
- Confirmed product subtitle and product description remain optional localized fields and do not block publish by themselves.
- Updated `CONTEXT.md`, ADR `docs/adr/0006-bilingual-catalog-localization.md`, this change's design, tasks, and spec to document the field-specific requirement.
- Added unit coverage in `apps/backend/src/routes/admin/products.test.ts` for missing English title allowed and missing Vietnamese title rejected.
- Verification: `pnpm --filter backend exec vitest run --config vitest.config.ts src/routes/admin/products.test.ts`, `pnpm --filter backend check`, and `openspec validate bilingual-catalog-localization --strict` pass.

## Update: Returned both languages in API
- Migrated Storefront endpoints (products, collections, orders) to return full `LocalizedTextValue` (with both `vi` and `en`) instead of resolving on the backend.
- Created a storefront translation helper (`getLocalized`) to resolve strings to the user's selected locale on the client-side.
- Updated all product display components (Product Detail, Cart, Checkout, Order Confirmation) to use `getLocalized`.
- Verified type safety and test pass with `./init.sh`.


## Progress

- All tasks are complete.
- Implemented catalog translation system (database schema, utils).
- Updated admin endpoints to process and persist localized fields.
- Updated storefront API to accept `locale` and resolve translations at runtime.
- Passed storefront locale through React Router loaders to API.
- Fixed order checkout, cart resolution, and snapshots to use localized fields.
- Fixed all typescript errors in backend and admin.
- ./init.sh verifies correctly.

Next Step: Archive change.
