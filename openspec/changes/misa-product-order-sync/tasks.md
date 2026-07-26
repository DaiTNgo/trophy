## 1. Prerequisites and MISA client

- [ ] 1.1 Verify the operator-provided `product_variants.misa_product_id` column is available in local and target D1 environments; do not generate a migration in this change.
- [x] 1.2 Add local/production MISA environment bindings and document required secrets without committing credentials.
- [x] 1.3 Implement the shared MISA v2 client for token acquisition, headers, response parsing, logical validation errors, and request retries/limits where already supported by the backend conventions.
- [x] 1.4 Add MISA client tests for token requests, `Clientid`/Bearer headers, success responses, HTTP failures, and nested validation failures.

## 2. Product synchronization

- [x] 2.1 Implement MISA product lookup by `product_code` and minimal product creation using only `product_code`, `product_name`, and `inactive: false`.
- [x] 2.2 Update admin product publish to require variant SKUs, synchronize all variants to MISA before local publish, and preserve idempotency for existing codes.
- [x] 2.3 Resolve and persist numeric MISA product IDs on matching Trophy variants after publish.
- [x] 2.4 Add guarded admin product deletion that blocks ordered products, deletes stored MISA IDs first, falls back to SKU lookup for legacy variants, and then deletes local relations.
- [x] 2.5 Add route/service contract tests for publish and delete success, missing SKU, MISA failure, missing IDs, ordered-product conflict, and local deletion behavior.

## 3. Admin MISA proxy and UI

- [x] 3.1 Add protected admin proxy routes for MISA product GET, POST, PUT, and DELETE operations with server-side token acquisition.
- [x] 3.2 Add proxy route tests for authentication, validation, MISA success, and MISA failure responses, asserting no bearer token is returned.
- [x] 3.3 Add a standalone Admin MISA Products screen with search, refresh, normalized product fields, and product-code copy action.
- [x] 3.4 Connect the existing Product List Edit and Delete actions to real routes while keeping Archive out of scope.

## 4. Checkout order synchronization

- [x] 4.1 Implement MISA contact payload mapping from Trophy customer and address snapshots.
- [x] 4.2 Implement MISA sale-order payload mapping from Trophy order, shipping, totals, and SKU line items.
- [x] 4.3 Trigger contact and sale-order synchronization after local order creation and persist sync status, identifiers, attempts, and errors without rolling back the local order.
- [x] 4.4 Add checkout/order contract tests for successful sync, missing SKU, MISA failure, and preserved local order behavior.

## 5. Documentation and verification

- [x] 5.1 Document local/production configuration, prerequisite migration shape, MISA flow, and Bruno URLs in backend documentation.
- [x] 5.2 Run backend tests, check, build, admin build, and the repository `./init.sh` verification.
- [x] 5.3 Record final verification results and any residual MISA tenant/API assumptions in the change progress and handoff notes.
