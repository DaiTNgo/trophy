# Session Handoff

## Current state

The confirmed MISA variant synchronization contract is implemented and verified with `./init.sh` on 2026-08-03. The active schema includes per-variant MISA ID, status, error, and sync-time fields; publish and local saves remain successful when MISA fails.

MISA sale-order lines use the string form of the persisted order item's Trophy variant ID as `product_code`, matching the MISA product synchronization contract. SKU is retained only as Trophy operational/display data.

Admin Order Detail has a MISA panel showing synchronization status, stored MISA contact/sale-order IDs, attempts, latest success time, and the latest error. It is read-only; retry/reconciliation actions remain deferred.

The local order `ORD-MSDBN635-HLTD` failed while creating its Contact with MISA's generic `Không được để trống`, before a SaleOrder request was made. The outgoing Contact and SaleOrder payloads now use the documented minimal shape and `form_layout: "Mẫu tiêu chuẩn"`; sale-order line `to_currency` equals its local line subtotal. Create a new checkout to determine whether the tenant still requires a Contact field beyond the published OpenAPI schema.

The minimal Contact and SaleOrder JSON payloads were subsequently confirmed manually against MISA for Trophy product `16`, variant `25`. Checkout matches that exact payload and intentionally omits optional email and shipping fields from the initial create call.

Checkout resolves `TROPHY-<normalized-phone>` through `GET /Contacts/code` before creating a Contact. Do not remove this lookup: a returned Contact is reused for SaleOrder creation and avoids duplicates.

When a checkout email is present, the backend also scans MISA Contacts pages for a case-insensitive email match if its derived contact code is absent. It reuses an email match only when the phone is the same. When the phone differs, it creates a new phone-code Contact without email and SaleOrder references that new code, avoiding MISA's duplicate-email violation.

Admin Product Detail renders the per-variant MISA status in its variants table, with a tooltip for the latest failure message.

Published variants also expose a typed Hono RPC `Sync MISA` action in their More menu. The route is `POST /api/admin/products/:id/variants/:variantId/misa-sync` and returns the per-variant result rather than failing the product lifecycle.

Published product-name edits enqueue MISA updates through Worker `waitUntil`; do not change this to an awaited request, because Product Detail Save must not remain loading while MISA is unavailable.

The default local D1 had been schema-pushed ahead of its migration journal: the order MISA columns already existed while `0023` was pending. The local database was reconciled by adding the missing variant columns and recording `0023_low_randall_flagg.sql`; `pnpm run db:migrate:local` now reports no pending migrations. The migration itself was also applied successfully on a fresh persisted local D1 database.

## Operator action

Apply the four `product_variants` MISA columns in D1 before deploying. The worktree contains `apps/backend/drizzle/0023_low_randall_flagg.sql`, which has not been applied; confirm its ownership before including it in a deployment.

## Next scope

Any manual retry, scheduled retry, or dedicated MISA reconciliation UI is explicitly deferred. Use the stored `pending`/`failed` state as its starting contract.
