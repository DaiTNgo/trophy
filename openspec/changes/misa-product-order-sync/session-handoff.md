# Session Handoff

## Current state

The current checkout UML is in `docs/misa/checkout-field-mapping.md` under **UML luồng checkout theo checkbox VAT**. It is deliberately one decision flow: no VAT creates only a personal Customer and SaleOrder; VAT requires four invoice inputs, pre-validates the VAT Customer, then creates a Contact for the basic checkout person only when pre-validation returns a Customer code. A duplicate VAT tax code creates an unlinked SaleOrder without Customer/Contact fields and adds an admin action notice to its MISA `description`; MISA failure after a local order never removes that order.

Customer and Contact are intentionally headless integrations. Do not add a Customer ID mapping and do not persist or return a Contact ID. Both entities are derived from the order snapshot and their deterministic phone/MST codes. When MISA rejects a SaleOrder with “khách hàng đã bị xóa”, backend creates the Customer payload again and retries the same SaleOrder exactly once. Keep SaleOrder ID persistence: it belongs to the order reconciliation/purge flow, not Customer/Contact mapping.

SaleOrder `shipping_contact_name` is the checkout buyer name (`customer.name`); it is not a separate shipping-recipient input. `sale_order_date` is formatted from the persisted order `createdAt` in the `Asia/Ho_Chi_Minh` time zone as `DD/MM/YYYY`.

Payload identity is exclusive: a VAT checkout sends only invoice fields to Customer and sends the basic checkout person to Contact; a non-VAT checkout sends the basic person only to Customer and does not create a Contact or send SaleOrder `contact_name`. The request-local Customer code returned by VAT prevalidation must be passed into the immediate SaleOrder synchronization, avoiding a duplicate Customer create without persisting any MISA mapping. The VAT description includes `YEU CAU XUAT HOA DON` followed by invoice fields and the shopper note.

Contact lookup is restricted to the deterministic `contact_code`; do not scan Contacts by email. If MISA rejects a new Contact because `email` is duplicate, do not retry it without an email. Create the SaleOrder with the resolved Customer but without `contact_name`, and write the duplicate-email/manual-Contact-reconciliation warning into its MISA `description`. Do not bypass other Contact errors.

Generated MISA codes are standardized: Customer uses `KH-<normalized-phone>` or `KH-TAX-<normalized-MST>`, while Contact uses `LH-<normalized-phone>`. Keep the prefixes in every retry and related SaleOrder field.

When MISA rejects Customer creation with a validation message for `account_number`, Trophy retries the base code with `-1` through `-99` suffixes and uses the first accepted code for the Contact and SaleOrder. Example: `KH-090123`, then `KH-090123-1`, then `KH-090123-2`. Do not apply this retry to tax code, email, phone, or any other Customer error; those remain visible to the checkout/error flow. No resulting Customer or Contact identifier is stored in Trophy. Full `./init.sh` passes with 238 backend tests.

VAT invoice requests are now explicit in checkout. Selecting the checkbox requires invoice entity name, tax ID, invoice email, and invoice address; the old “invoice type” field has been removed from storefront, backend contract, stored VAT data, MISA description, and Admin Order Detail. The request includes `vatRequested` so backend rejects a client that declares VAT but omits the VAT object. The invoice email remains independent from optional basic checkout email and is preferred for MISA Customer `office_email`. For domain meaning: without VAT, Customer is the basic checkout person; with VAT, Customer is the invoice entity; the basic checkout person remains Contact and is selected by SaleOrder `contact_name`. Do not add or try `shipping_contact_name`; it is intentionally outside the integration scope. Full `./init.sh` passes with 236 backend tests.

For MISA API comparison, start with `docs/misa/README.md` and `docs/misa/openapi-v2-customer-contact-saleorder.md`. The latter records the public v2 endpoints and field relationships for Customer, Contact, and SaleOrder, then explicitly separates them from Trophy's phone/MST code conventions and the deliberate no-mapping decision. The original saved field exports remain in the same folder.

MISA checkout synchronization now creates or reuses a personal Customer before the Contact and SaleOrder. Customer identity is `TROPHY-<normalized phone>` in `account_number`; send that same value as Contact `account_name` and SaleOrder `account_name`, and continue using the Contact code as SaleOrder `contact_name`. This is the documented relationship MISA needs to display Customer and recipient/contact information. The mapping is in `apps/backend/src/lib/misa.ts`; regression coverage is in `apps/backend/src/lib/misa.test.ts`.

When an existing Contact lacks or has a different `account_name`, checkout synchronization now updates it through `PUT /Contacts` before posting the SaleOrder. This repairs legacy Contacts that were created before Customer synchronization, so retrying MISA synchronization for the affected order is sufficient after deployment.

VAT checkout data now creates/reuses a company Customer when `vat.taxId` is populated. Its key is `KH-TAX-<normalized MST>` and its MISA `tax_code` is the MST; `is_personal` is `false`; company name, invoice email, and invoice address come from the VAT fields. Without a tax ID, checkout retains the phone-keyed personal Customer. The Contact and SaleOrder use whichever Customer code was selected.

MISA is the authority for VAT Customer validation. When a checkout includes `vat.taxId`, backend creates/reuses the MISA Customer before it persists the local order. MISA errors for `tax_code`, `account_name`, `office_email`, and `billing_address` return HTTP 422 with the mapped VAT form field; storefront focuses that input and renders MISA's message inline. No locally inferred MST checksum validation remains in browser or backend. The checkout API client aligns with backend address validation by treating `city` and `country` as optional. Full `./init.sh` passes after this correction.

MISA does not expose a reliable Customer lookup by VAT tax code. Do not scan paginated Customers to establish an integration link. When MISA rejects a Customer only because `tax_code` is duplicate, checkout bypasses that response and creates the local order for operator reconciliation; other VAT field errors continue to focus and render at the corresponding checkout input.

When a pre-existing Contact needs linking to a Customer, `PUT /Contacts` sends only `form_layout`, its known `contact_code`, and `account_name`. Do not add email, phone, or name to this relationship-only update: MISA validates them unnecessarily and may reject duplicate values owned by another Contact.

Verification for this addition: backend test suite (231 tests), backend check/build, and `git diff --check` pass. `./init.sh` stops at the existing storefront type error `apps/storefront/app/routes/checkout.tsx:305`, where an address value lacks `city` and `country`.

Checkout now transfers the current VAT invoice request safely without treating it as an issued invoice. `buildMisaSaleOrderPayload` maps checkout `primaryAddress` to MISA billing fields, maps a different shipping address when present, and places company name, tax ID, invoice email, invoice address, and the shopper note into the documented SaleOrder `description`. Do not add `is_invoiced` or `invoiced_amount` at checkout; that would claim an invoice has been issued.

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
