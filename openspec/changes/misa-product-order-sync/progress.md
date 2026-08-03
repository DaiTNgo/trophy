# Progress

## 2026-08-03 migration reconciliation

- Local D1 had the six MISA order columns already present while `d1_migrations` stopped at `0022`, indicating the schema had previously been pushed outside the migration history. The generated `0023_low_randall_flagg.sql` remains unchanged because it is correct for a database at migration `0022` and for remote environments that still need the order columns.
- Reconciled the existing local database by adding its three missing `product_variants` MISA columns and recording `0023_low_randall_flagg.sql` in `d1_migrations`. `pnpm run db:migrate:local` now reports no migrations to apply.
- Verified the unchanged migration end to end on a fresh persisted local D1 database; all migrations through `0023` applied successfully.

## 2026-08-03

- Contact creation now prevents both MISA duplicate dimensions: lookup by phone-derived `contact_code` first, then case-insensitive email lookup across MISA's paginated Contacts API when checkout includes an email. An email match with the same phone is reused; a different phone creates a new phone-code Contact with no email, avoiding the duplicate-email violation. Regression coverage proves the fallback payload and SaleOrder contact code. Verification: `./init.sh` passes (140 backend tests, backend/admin/storefront checks and builds).
- Checkout now looks up `GET /Contacts/code?code=TROPHY-<normalized-phone>` before posting a Contact. An existing Contact is reused for the SaleOrder; only a missing code triggers Contact creation. Added a regression test proving the existing-contact flow makes no Contact POST. Verification: `./init.sh` passes (139 backend tests, backend/admin/storefront checks and builds).
- Confirmed the minimal Contact and SaleOrder payloads manually against MISA for Trophy product `16` / variant `25`. The backend now sends that exact shape at checkout: Contact has only standard layout, code, name, and phone; SaleOrder has order identity/totals/contact/description/layout plus documented line fields. Optional customer email and shipping fields are intentionally omitted from this initial create call.
- Investigated a local failed checkout: MISA rejected the Contact request with `Không được để trống`, so the SaleOrder request never ran. The public OpenAPI schema declares no required properties, but tenant configuration can still require values. Aligned the outgoing payload to the documented minimal shape: standard `Mẫu tiêu chuẩn` layout, no unrecognized `lead_source` or sale-order metadata, and each line's `to_currency` now equals its persisted subtotal. A new checkout is required to confirm any tenant-specific mandatory Contact fields. Verification: `./init.sh` passes (137 backend tests, backend/admin/storefront checks and builds).
- Admin Order Detail now exposes and renders order MISA status, contact and sale-order IDs, attempt count, latest synchronization timestamp, and latest error for operator reconciliation. Verification: `pnpm --filter backend test -- src/routes/admin/orders.test.ts`, `pnpm --filter admin build`, and `./init.sh` pass (137 backend tests).
- Corrected MISA sale-order line mapping to use the stable Trophy `product_variants.id` string as `product_code`, matching the product synchronization contract. A missing or invalid variant ID now fails the MISA attempt with a clear error; the local order remains intact. Verification: `pnpm --filter backend test` (132 tests), `pnpm --filter backend check`, `pnpm --filter backend build`, and `./init.sh` all pass.
- Replaced SKU-based MISA product mapping with the stable Trophy `product_variants.id` string as `product_code`.
- All MISA create and update requests from Trophy product lifecycle routes now send `product_name` as `Product title - Variant title`, `inactive: false`, `usage_unit: "Cái"`, `product_properties: "Hàng hóa"`, and `form_layout: "Mẫu tiêu chuẩn"`.
- Added per-variant `pending`/`synced`/`failed` state, latest error, and successful sync time beside the existing MISA product ID. MISA errors and missing credentials no longer block local product save or publish; partial outcomes are recorded independently per variant.
- Synced variants use MISA `PUT` on published product/variant name changes. New variants on published products are created in MISA. No automatic retry was added.
- Variant deletion now rejects historical order references and deletes its known MISA record before local deletion. Unsynced variants delete locally without a MISA call.
- Admin Product Detail now maps the per-variant MISA state and displays `Synced`, `Pending`, or `Failed` in the variants table. Failed badges expose the latest MISA error on hover.
- Published Product Detail variants now have a `Sync MISA` More-menu action. It uses Hono RPC to call the typed single-variant sync route, refreshes the table, and reports the returned `synced` or `failed` status. Draft products do not render the action; the backend independently rejects draft sync requests.
- Fixed Product Detail overview Save remaining in a loading state when renaming a published product. The local PATCH response now returns immediately and schedules MISA name synchronization with the Worker `waitUntil` context; the explicit variant `Sync MISA` action remains synchronous so it can report its result.
- Verification passed: `./init.sh` (backend check, 129 backend tests, backend build, admin build, storefront typecheck/build) and `git diff --check`.

## Remaining prerequisite

- The worktree now contains `apps/backend/drizzle/0023_low_randall_flagg.sql` for the order and per-variant MISA columns. It has not been applied to D1.
- Operator must apply `product_variants.misa_product_id`, `misa_sync_status`, `misa_last_error`, and `misa_synced_at` before deploying.
