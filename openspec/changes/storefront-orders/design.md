## Context

The backend currently owns product persistence, published storefront product reads, variant pricing, ordered variant media, product-owned customization, and customization asset uploads. The storefront has cart and checkout screens, but order data is still mock-first and there is no backend order creation route or order persistence.

The agreed domain model is that order creation captures immutable snapshots. The backend, not the browser, reads the current product, variant, price, customization template, and selected variant background when the shopper requests order creation. Orders are manual-payment orders: there is no online payment gateway, and payment is confirmed later by bank transfer or collected on delivery.

## Goals / Non-Goals

**Goals:**

- Add `POST /api/storefront/orders` for public shopper checkout submissions.
- Persist orders with one or more order items.
- Persist customer, primary address, optional different shipping address, manual payment method, and initial order/payment/fulfillment states.
- Capture product, variant, price, selected variant background, and customization snapshots per item.
- Validate product status, variant ownership, variant price, quantity, and customization requirements before writing the order.
- Build customized item rendered designs on the backend from shopper values and the current product-owned customization model.
- Return a shopper-facing order number and confirmation summary.
- Add route-level backend tests for success and failure modes.

**Non-Goals:**

- No online payment authorization, capture, refunds, or payment gateway webhooks.
- No quote/contact request endpoint for Contact Price products.
- No inventory reservation, stock decrement, shipping carrier integration, or tax calculation.
- No admin order management UI replacement in this change.
- No production export job integration beyond storing enough snapshot data for later production.
- No compatibility migrations; the repo is in dev mode.

## Decisions

### Storefront orders use a public route surface

Add `POST /api/storefront/orders` under the existing storefront route namespace. The route accepts no admin session and uses storefront CORS, but still validates every referenced product and variant against published storefront data.

Alternative considered: create orders through an admin route or reuse mock admin order state. That was rejected because shopper checkout is a Storefront Route Surface concern and must not depend on operator session state.

### Product and price data are server-authoritative

Request items identify the selection by `productId` and `variantId` only. The browser does not submit product title, SKU, variant title, price, background, layers, or design data as trusted order data. The backend reads those values at request time and persists order item snapshots.

Alternative considered: accept the full cart line from the browser. That was rejected because stale or manipulated cart data could create incorrect prices or production output.

### Orders reject Contact Price items

If the selected variant has `price_amount = null`, order creation fails. Contact Price products should render a contact action on storefront instead of add-to-cart/checkout.

Alternative considered: create a pending unpriced order. That was rejected because orders require totals and a price snapshot. A future contact/quote request endpoint can handle unpriced inquiries separately.

### Customized items require backend-built snapshots

For products with `product_customizations.enabled = true`, each matching order item must include `customization.values`. The backend validates values against current form fields and layers, builds a rendered design from those values, and stores raw values, rendered design, template context, and selected variant background snapshot.

Alternative considered: accept rendered design JSON from the browser. That was rejected because production data must be reproducible from server-side validation and the trusted product customization model.

### Address data keeps primary and different shipping address

Order creation stores the shopper's primary checkout address and, when selected, a different shipping address with recipient name and phone. The backend does not collapse the submitted address data into only one resolved shipping address because admin and fulfillment screens need to see what the shopper supplied.

Alternative considered: submit only a resolved final shipping address. That was rejected because it loses the shopper's "ship to different address" intent and primary contact context.

### Manual payment is explicit but simple

The order request includes `payment.method` as `bank_transfer` or `cash_on_delivery`. New orders start `status = pending`, `paymentStatus = pending`, and `fulfillmentStatus = unfulfilled`.

Alternative considered: omit payment fields until online payment exists. That was rejected because manual bank transfer and cash-on-delivery are different operational flows even without a gateway.

### Production status is per item

Order items store `productionStatus`. Non-customized items start `not_required`; customized items start `pending_review` so operators can review shopper-provided artwork before production.

Alternative considered: use one order-level production state. That was rejected because a multi-item order can mix customized and non-customized products.

## Risks / Trade-offs

- **Snapshot JSON can grow large** → Keep snapshots scoped to fields needed for confirmation, admin review, and production reproduction; avoid storing redundant full product graphs.
- **Customization server rendering may differ from browser preview if text measurement differs** → Reuse shared customization helpers and record the backend-built design as the production source of truth.
- **Multiple item validation can partially succeed before failure** → Validate all items before writing or use a single transaction so failed submissions do not leave partial orders.
- **Manual payment states can expand later** → Start with narrow status enums and add admin transitions in a later order-management change.
- **No Contact Price order path** → Storefront must hide add-to-cart/checkout for unpriced variants and point shoppers to contact instead.

## Migration Plan

1. Add order database tables and order snapshot columns.
2. Add order input validation schemas and snapshot builder helpers.
3. Implement storefront order route with all-item validation before persistence.
4. Add route-level contract tests for valid orders and failure modes.
5. Wire storefront checkout to the route in a later UI slice or as part of implementation if in scope.
6. Verify backend tests/check/build, OpenSpec validation, and the root verification entrypoint.

Rollback is a code rollback during dev mode. Local D1 can be recreated from the updated schema if needed.

## Open Questions

None.
