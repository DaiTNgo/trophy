## Why

Trophy currently has no active MISA integration in the branch, so products published from admin and orders created at checkout are not represented in MISA. Rebuilding this boundary now gives MISA the operational product/order records while keeping Trophy responsible for storefront and checkout behavior.

## What Changes

- Add a backend MISA client for token acquisition, product synchronization, contacts, and sale orders.
- Synchronize every SKU-backed Trophy variant to MISA before marking a product as published.
- Persist the numeric MISA product ID on each Trophy variant after synchronization.
- Delete products from MISA before deleting their local Trophy records, with an order-reference guard.
- Add protected admin MISA proxy endpoints and a standalone MISA Products screen for debugging and lookup.
- Synchronize a successful Trophy checkout order to MISA after the local order is created.
- Document local/production MISA configuration and Bruno requests.

Archive/inactive lifecycle changes and migration file authoring are explicitly out of scope. The operator will create/apply the database migration for `product_variants.misa_product_id` separately.

## Capabilities

### New Capabilities

- `misa-product-sync`: Synchronize Trophy products and variants with MISA during publish and delete.
- `misa-admin-proxy`: Expose protected backend proxy operations and a standalone admin lookup screen for MISA products.
- `misa-order-sync`: Send newly created Trophy checkout orders and contacts to MISA.

### Modified Capabilities

- None.

## Impact

- Backend: new MISA service, product lifecycle routes, checkout order integration, admin proxy routes, environment bindings, and tests.
- Database: requires an operator-provided `product_variants.misa_product_id` column; this change does not author the migration.
- Admin: MISA Products screen and product action wiring for existing Edit/Delete flows.
- Documentation: backend environment setup, MISA API behavior, and Bruno examples.
