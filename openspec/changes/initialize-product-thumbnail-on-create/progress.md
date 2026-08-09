# Progress

## Current State

- 2026-08-09: Implemented initial Product Thumbnail assignment in Admin full-create. The backend scans created variants in submission order, selects each Customization Background before its first Variant Media, and stores only the existing asset ID. The assignment is best effort: errors are logged with Product/asset context and do not roll back the created Product.
- Added selection unit tests and Hono route contract tests for customization priority, gallery fallback, later-variant selection, absent media, and a non-blocking thumbnail-update failure.
- Verification: `pnpm --filter backend test` (38 files, 228 tests), `pnpm --filter backend check`, `pnpm --filter backend build`, and `git diff --check` pass. `./init.sh` passes backend and admin build, then stops at the pre-existing storefront TypeScript error in `apps/storefront/app/routes/checkout.tsx:305`: the address value supplies `line1` but omits required `city` and `country`.
- 2026-08-09: Removed full-create's replacement-path database work. Creation now inserts attributes, options/value lookup, variants, option links, and variant attributes directly; it returns ordered inserted variants for media persistence, eliminating the intermediate aggregate `readProduct` and guaranteed-empty replacement reads/deletes. Catalog translations are collected and sent as one multi-row SQLite upsert. This uses the existing Drizzle D1 driver and Cloudflare Worker D1 binding, with no Node-only APIs. Added persistence tests that assert no `select`, `update`, or `delete` calls on this creation path and that all translations use one upsert. Verification: 39 backend test files / 229 tests, backend check/build, admin build, and `git diff --check` pass. Fresh `./init.sh` still stops only at the pre-existing storefront `checkout.tsx:305` address type error.

## Next Step

- All implementation tasks are complete. The change is ready to archive once the known unrelated storefront typecheck failure is resolved or accepted.
