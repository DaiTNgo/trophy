## Context

The backend owns product persistence, published storefront product reads, variant pricing, ordered variant media, product-owned customization, customization asset uploads, and order persistence. The storefront has product detail, cart, checkout, and confirmation screens, but the current cart and checkout wiring is mock-first: checkout can submit hardcoded item IDs instead of the shopper's real product/variant/customization selections.

The agreed domain model is that the browser owns pending cart lines, while the backend owns order validation and snapshots. A cart line contains only the shopper's selection: product ID, variant ID, quantity, and any required customization values. Product title, SKU, price, selected background, rendered design, and production snapshots are read and captured by the backend at order creation time.

Checkout has no online payment step and no shopper-selected payment method. The storefront submits customer and delivery information, then the backend creates a manual payment order for operator follow-up.

## Goals / Non-Goals

**Goals:**

- Add a browser-owned storefront cart backed by localStorage and a CartProvider.
- Add product detail add-to-cart for selected priced variants.
- Require customizable products to collect valid customization values before add-to-cart.
- Merge cart lines by product and variant for non-customized products, and by product, variant, and identical customization values for customized products.
- Add a public cart-line resolver endpoint that hydrates cart lines with current shopper-safe display and availability data.
- Keep cart and checkout blocked for Contact Price variants and invalid/stale lines.
- Add or update `POST /api/storefront/orders` for checkout-ready cart lines.
- Remove shopper-facing payment method selection from checkout and default manual order handling server-side.
- Persist orders with one or more order items, customer details, primary address, optional different shipping address, totals, and item snapshots.
- Return a shopper-facing order number and confirmation summary.
- Clear the browser cart only after successful order creation.
- Add public storefront order lookup requiring order number and customer phone.
- Wire admin order list/detail to authenticated backend read APIs so operators can see storefront-created orders.
- Add route-level backend tests for creation, cart hydration, public lookup, and admin order reads.

**Non-Goals:**

- No online payment authorization, capture, refunds, payment gateway webhooks, or shopper payment selection.
- No quote/contact request endpoint for Contact Price products.
- No inventory reservation, stock decrement, shipping carrier integration, shipping fee calculation, or tax calculation.
- No admin order status transition workflow beyond read-only list/detail.
- No production review/approval/export workflow for customized order items.
- No public order lookup by order number alone.
- No compatibility migrations; the repo is in dev mode.

## Decisions

### Storefront cart is browser-owned

Storefront cart lines are stored locally in the browser and exposed through a CartProvider so the navbar count, product detail add action, cart page, and checkout page stay in sync. localStorage is sufficient because the project has no shopper account or server-side cart.

Alternative considered: server-side cart. That was rejected for this slice because it introduces account/session ownership before the project needs it.

### Cart lines are shopper selections, not trusted snapshots

Cart lines identify product ID, variant ID, quantity, and optional customization values. The cart may keep a thin display cache for rendering, but the backend does not trust cart-supplied title, SKU, price, thumbnails, or design output.

Alternative considered: store rich product snapshots in localStorage and submit them during checkout. That was rejected because stale or manipulated client data could create wrong prices or production records.

### Variant selection is required before add-to-cart

Product detail must add only a concrete selected variant. If a product has exactly one priced variant, the storefront can auto-select it. Contact Price variants cannot be added to cart.

Alternative considered: add product-level cart lines before variant selection. That was rejected because the variant is the priced purchasable unit and determines the selected variant background for customization.

### Customization is completed before add-to-cart

For customizable products, shopper customization values are required before a cart line can be created. Checkout submits only checkout-ready cart lines.

Alternative considered: allow incomplete customized cart lines and finish customization in cart or checkout. That was rejected because checkout would fail late and the cart would need a separate incomplete-line state.

### Cart line merge depends on customization values

Non-customized lines merge by product and variant. Customized lines merge only when product, variant, and customization values are identical; otherwise they remain separate lines.

Alternative considered: always merge by variant. That was rejected because two customized items can have the same variant but different production content.

### Cart hydration uses a batch public endpoint

Add a public cart-line resolver endpoint that accepts multiple product/variant selections and returns shopper-safe display and validity data for each line. Cart and checkout use this to avoid N+1 product detail requests and to detect stale lines before order creation.

Order creation still performs final validation; cart hydration is an early UX check, not the source of order truth.

### Checkout has no payment step

The checkout route collects customer and delivery information, reviews the cart, and submits the order. The backend creates a manual payment order in pending state for operator follow-up.

Alternative considered: keep a hidden or visible `payment.method` in the public contract. That was rejected because it implies a shopper payment choice the business does not offer.

### Storefront order lookup requires order number and phone

Add a public lookup flow requiring order number and customer phone. The response is shopper-safe: status, totals, item summaries, and limited customer/delivery summary. It must not expose internal rendered design JSON, template snapshots, admin notes, or production internals.

Alternative considered: lookup by order number only. That was rejected because order numbers are shopper-facing and could leak order details if guessed or shared.

### Admin order visibility is read-only in this slice

Admin orders list/detail should read backend-created orders through authenticated admin routes. This replaces mock data for order visibility, but status transitions, payment follow-up, and production review remain separate work.

Alternative considered: leave admin orders mock-first. That was rejected because operators would not see real storefront-created orders, breaking the end-to-end business flow.

## Risks / Trade-offs

- **localStorage cart can become stale** -> Cart hydration and order creation both revalidate against backend state. Failed checkout keeps the cart so shoppers can edit or remove lines.
- **Public order lookup can leak data** -> Require order number plus phone and return only shopper-safe summaries.
- **Cart hydration duplicates some validation shape** -> Keep it shallow: product/variant availability, price/contact-price state, and customization requirement only. Deep customization validation remains in order creation.
- **Admin order pages may need future rewrite** -> Start read-only so real orders are visible without prematurely designing status workflows.
- **No payment method in request changes current route tests** -> Update backend tests and contracts now while the project is still in dev mode.

## Migration Plan

1. Update order creation request schema to remove shopper payment selection and default manual order state server-side.
2. Add public cart-line resolver route and tests.
3. Add public order lookup route requiring order number and phone, with shopper-safe response tests.
4. Add admin order list/detail read routes with auth/role tests.
5. Implement CartProvider/localStorage helpers and cart-line merge tests.
6. Wire product detail add-to-cart with variant/customization/contact-price rules.
7. Wire cart page quantity/remove behavior and hydration.
8. Wire checkout to submit real cart lines client-side, clear cart on success, and navigate to confirmation.
9. Add order confirmation and order lookup UX.
10. Replace admin mock order list/detail data with backend read APIs.
11. Verify backend tests/check/build, storefront typecheck/build, admin build, OpenSpec validation, and `./init.sh`.

Rollback is a code rollback during dev mode. Local D1 can be recreated from the updated schema if needed.

## Open Questions

None after the 2026-07-05 grill session.
