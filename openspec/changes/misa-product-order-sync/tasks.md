## 1. Prerequisites and MISA client

- [ ] 1.1 Verify the operator-provided `product_variants.misa_product_id`, `misa_sync_status`, `misa_last_error`, and `misa_synced_at` columns are available in local and target D1 environments; do not generate a migration in this change.
- [x] 1.2 Add local/production MISA environment bindings and document required secrets without committing credentials.
- [x] 1.3 Implement the shared MISA v2 client for token acquisition, headers, response parsing, logical validation errors, and request retries/limits where already supported by the backend conventions.
- [x] 1.4 Add MISA client tests for token requests, `Clientid`/Bearer headers, success responses, HTTP failures, and nested validation failures.

## 2. Product synchronization

- [x] 2.1 Implement MISA product lookup, creation, and update with Trophy variant IDs as `product_code` and the fixed six-field product form.
- [x] 2.2 Synchronize after local publish, published product/variant name changes, and adding a variant to a published product; do not let MISA failures block the local action.
- [x] 2.3 Persist each variant's numeric MISA ID, `pending`/`synced`/`failed` state, latest error, and successful sync time.
- [x] 2.4 Add guarded product and variant deletion: block historical order references, delete known MISA records first, then remove local data.
- [x] 2.5 Add route/service contract tests for the fixed product form, MISA update, successful publish synchronization, and MISA failure with preserved publish.
- [x] 2.6 Run published product-name synchronization in the Worker background so the local Product Detail Save action never waits for MISA.

## 3. Admin MISA proxy and UI

- [x] 3.1 Add protected admin proxy routes for MISA product GET, POST, PUT, and DELETE operations with server-side token acquisition.
- [x] 3.2 Add proxy route tests for authentication, validation, MISA success, and MISA failure responses, asserting no bearer token is returned.
- [x] 3.3 Add a standalone Admin MISA Products screen with search, refresh, normalized product fields, and product-code copy action.
- [x] 3.4 Connect the existing Product List Edit and Delete actions to real routes while keeping Archive out of scope.
- [x] 3.5 Show each Product Detail variant's MISA synchronization status and latest error tooltip in the admin variants table.
- [x] 3.6 Add the published-variant More-menu action for typed manual MISA synchronization and refresh the displayed status.

## 4. Checkout order synchronization

- [x] 4.1 Implement MISA contact payload mapping from Trophy customer and address snapshots.
- [x] 4.2 Implement MISA sale-order payload mapping from Trophy order, shipping, totals, and stable variant-ID line items.
- [x] 4.3 Trigger contact and sale-order synchronization after local order creation and persist sync status, identifiers, attempts, and errors without rolling back the local order.
- [x] 4.4 Add checkout/order contract tests for successful sync, missing variant ID, MISA failure, and preserved local order behavior.
- [x] 4.5 Expose order MISA synchronization state and identifiers in Admin Order Detail.
- [x] 4.6 Align the checkout MISA payload with the published schema, including line totals and standard form layout.
- [x] 4.7 Look up and reuse an existing MISA Contact before checkout creates a Contact.
- [x] 4.8 Reuse an existing MISA Contact by email when its contact code differs from the checkout phone-derived code.
- [x] 4.9 Create a phone-only Contact when an existing MISA email belongs to a different phone number.
- [x] 4.10 Map checkout billing/shipping addresses to documented SaleOrder fields and preserve VAT invoice requests with shopper notes in `description`.
- [x] 4.11 Preserve the checkout payment method and return signed, short-lived same-screen payment instructions using the short `PT-<order id>` transfer reference while retaining the full MISA sale-order number.
- [x] 4.12 Replace admin cancellation with a manual, super-admin-only MISA-first permanent purge for abandoned checkout orders; never delete MISA Contacts.
- [x] 4.13 Use the assigned incrementing local order ID as the public order number and MISA `sale_order_no`.
- [x] 4.14 Add super-admin manual MISA SaleOrder disconnect, connect, and retry/refresh reconciliation, including revision sale-order numbers and persisted MISA sale-order number.
- [x] 4.15 Persist the real MISA create response ID and make automatic presence checks distinguish explicit absence from an inconclusive successful lookup.
- [ ] 4.16 Synchronize a phone-keyed MISA Customer before its Contact and SaleOrder so MISA displays the checkout Customer and recipient relationship.

## 5. Documentation and verification

- [x] 5.1 Document local/production configuration, prerequisite migration shape, MISA flow, and Bruno URLs in backend documentation.
- [x] 5.2 Run backend tests, check, build, admin build, and the repository `./init.sh` verification.
- [x] 5.3 Record final verification results and any residual MISA tenant/API assumptions in the change progress and handoff notes.
