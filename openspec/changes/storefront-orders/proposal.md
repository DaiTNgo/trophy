## Why

Storefront checkout currently has no backend order creation contract, while product detail already exposes published products, priced variants, and product-owned customization data. The order endpoint needs to accept multi-item checkout submissions, capture server-authoritative product and customization snapshots, and support the project's manual payment workflow.

## What Changes

- Add a public storefront order creation API under `/api/storefront/orders`.
- Accept checkout submissions with customer details, primary address, optional different shipping address, manual payment method, and one or more order items.
- Validate each order item against published products, selected variants, variant prices, and product customization requirements.
- Reject Contact Price items because orders require a backend-captured price snapshot and total.
- Capture immutable order item snapshots for product, variant, price, selected variant background, and customization context at order creation time.
- For customizable products, require shopper customization values, validate them server-side, and store raw values plus a backend-built rendered design snapshot.
- Add order, order item, and snapshot persistence for manual-payment orders without online payment gateway integration.
- Return a shopper-facing order number and order summary for confirmation pages.
- Add backend route-surface tests covering success and important validation failures.

## Capabilities

### New Capabilities

- `storefront-orders`: Public storefront order creation, multi-item checkout validation, manual payment order state, immutable item snapshots, and customization snapshot capture.

### Modified Capabilities

None.

## Impact

- `apps/backend`: new order schema, storefront order route, validation helpers, snapshot builders, and route tests.
- `apps/storefront`: checkout submission contract and confirmation routing can use the new order response after implementation.
- `packages/customization`: existing validation and design-building helpers are reused for server-side customization validation and rendered design snapshots.
- Local D1 schema may change without compatibility migrations because the repository is in dev mode.
