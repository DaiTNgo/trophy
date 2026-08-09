# Session Handoff

## Current state

Checkout now transfers the current VAT invoice request safely without treating it as an issued invoice. `buildMisaSaleOrderPayload` maps checkout `primaryAddress` to MISA billing fields, maps a different shipping address when present, and places invoice type, company name, tax ID, invoice email, invoice address, and the shopper note into the documented SaleOrder `description`. Do not add `is_invoiced` or `invoiced_amount` at checkout; that would claim an invoice has been issued.

The single-screen checkout now creates the order only when the shopper submits the form, then navigates back to `/checkout?order=...&access=...` to show payment instructions. The signed, seven-day `access` token is verified server-side using a domain-separated HMAC key based on `BETTER_AUTH_SECRET`; the endpoint returns only payment information, not customer/order-preview data. Transfer reconciliation uses `PT-<order id>` (for example, `PT-123`), while the full order number remains MISA `sale_order_no`; the MISA description carries the short payment reference too. The backend now persists `bank_transfer` or `cash_on_delivery` instead of the obsolete `manual` value for new checkout orders.

For every new checkout, the public `orderNumber` is now the assigned incrementing SQLite order ID as a string (for example, `123`), not an `ORD-...` random identifier. The same value is sent to MISA as `sale_order_no`. The temporary non-null insert value is replaced before order items, MISA synchronization, or any API response.

MISA links on an order are manually managed by a super-admin. Disconnect is local-only and leaves MISA SaleOrder/Contact records intact. Connect and Refresh first query MISA by the original order number and re-link an existing ID before creating anything. If MISA reports a duplicate creation but cannot return a linkable original record, the backend tries `-R2` then later revision suffixes; it does not fall back for ambiguous network/authentication errors. The actual linked MISA code is stored in `orders.misa_sale_order_no`, added by migration `0032_optimal_maginty.sql`. See ADR 0017.

Checkout extracts the MISA SaleOrder ID from the real create response shape, `results[].data`, and persists it immediately. The configured tenant requires `GET /SaleOrders/id?ids=<id>` (plural `ids`) for SaleOrder ID lookup; the incorrect singular query key returns HTTP 200 without data. The automatic presence check uses the persisted MISA ID and only an explicit MISA HTTP 404 becomes `missing`. Existing false-`missing` rows with a stored MISA ID self-heal when Order Detail is opened.

Admin has no Cancel action. Its only permanent-removal workflow is a super-admin-only purge for an abandoned checkout order (`pending / pending / unfulfilled`). The route deletes the numeric MISA SaleOrder before local data; MISA 404 is accepted as already absent, but every other MISA failure blocks local deletion. An order with no MISA SaleOrder ID can be purged locally. It never deletes a MISA Contact. Target R2 media is queued for standard cleanup after the database rows are removed. See `docs/adr/0016-order-purge-is-misa-first.md` and `docs/plans/2026-08-09-misa-first-order-purge-design.md`.

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
