## Why

Storefront checkout currently has no complete end-to-end purchase flow from product detail to backend order visibility. Product detail exposes published products, priced variants, and product-owned customization data, but cart state is still mock-first, checkout submits hardcoded items, public order lookup does not exist, and the admin order pages still use mock order data.

The storefront needs a real browser cart, cart hydration from backend product data, checkout submission to backend order creation, shopper-safe order lookup, and read-only admin visibility for the orders shoppers create.

## What Changes

- Add a real storefront cart flow from product detail add-to-cart through cart review and checkout.
- Store cart lines in the browser with product ID, variant ID, quantity, and required customization values, while treating backend data as authoritative.
- Add a public cart-line resolver endpoint so cart and checkout can hydrate browser cart lines with current shopper-safe product, variant, price, and availability data.
- Add or update public storefront order creation under `/api/storefront/orders`.
- Accept checkout submissions with customer details, primary address, optional different shipping address, and one or more checkout-ready cart lines.
- Remove shopper-facing payment selection from checkout; backend creates manual payment orders for operator follow-up.
- Validate each order item against published products, selected variants, variant prices, and product customization requirements.
- Reject Contact Price items because orders require a backend-captured price snapshot and total.
- Capture immutable order item snapshots for product, variant, price, selected variant background, and customization context at order creation time.
- For customizable products, require shopper customization values, validate them server-side, and store raw values plus a backend-built rendered design snapshot.
- Add order, order item, and snapshot persistence for manual-payment orders without online payment gateway integration or shopper payment method selection.
- Return a shopper-facing order number and order summary for confirmation pages.
- Add public order lookup requiring order number and customer phone, returning only shopper-safe order summary data.
- Wire admin orders list/detail to authenticated backend order APIs in read-only form so operators can see storefront-created orders.
- Add backend route-surface tests covering success and important validation failures.

## Capabilities

### New Capabilities

- `storefront-orders`: Browser cart, cart-line hydration, public storefront order creation, multi-item checkout validation, manual order state, immutable item snapshots, customization snapshot capture, shopper order lookup, and read-only admin order visibility.

### Modified Capabilities

None.

## Impact

- `apps/backend`: order schema, storefront cart/order/lookup routes, admin order read routes, validation helpers, snapshot builders, and route tests.
- `apps/storefront`: product detail add-to-cart, CartProvider/localStorage state, cart page, checkout submission, confirmation, and order lookup route.
- `apps/admin`: read-only backend-backed orders list/detail replacing mock order data for storefront-created orders.
- `packages/customization`: existing validation and design-building helpers are reused for server-side customization validation and rendered design snapshots.
- Local D1 schema may change without compatibility migrations because the repository is in dev mode.
