## 1. Order Data Model And Existing Route Cleanup

- [x] 1.1 Add backend order, order item, and order snapshot tables to the Drizzle schema.
- [x] 1.2 Model order statuses, payment statuses, fulfillment statuses, and item production statuses with narrow string unions.
- [x] 1.3 Store customer details, primary address snapshot, optional different shipping address snapshot, and order totals on the order record.
- [x] 1.4 Store per-item product snapshot, variant snapshot, unit price snapshot, line subtotal, selected background snapshot, and optional customization snapshot JSON.
- [x] 1.5 Remove shopper-facing payment method from the public order creation request and default manual order state server-side.

## 2. Backend Validation And Snapshot Helpers

- [x] 2.1 Add a storefront order creation request schema for customer, shipping, and multi-item payloads.
- [x] 2.2 Add product and variant lookup helpers that require published products and validate variant ownership.
- [x] 2.3 Add price validation that rejects variants with `priceAmount: null` and calculates order totals from backend prices.
- [x] 2.4 Add customization validation that requires values for customizable products and rejects values for non-customizable products.
- [x] 2.5 Build customized item snapshots by validating shopper values, constructing the selected variant background, and creating a backend-rendered design snapshot.
- [x] 2.6 Ensure multi-item submissions validate fully before persistence or run in a transaction so failures create no partial orders.
- [x] 2.7 Normalize customer phone enough for order creation and storefront order lookup matching.

## 3. Storefront Cart Hydration API

- [x] 3.1 Add a public cart-line resolver endpoint under the Storefront Route Surface.
- [x] 3.2 Accept a batch of `{ productId, variantId }` selections and return one result per requested line.
- [x] 3.3 Return shopper-safe display data: product title, handle, variant title/SKU, thumbnail, price amount, customizable flag, and Contact Price state.
- [x] 3.4 Return availability/invalidity reasons for missing product, unpublished product, missing variant, variant mismatch, and Contact Price.
- [x] 3.5 Keep customization validation shallow in cart hydration: expose whether customization is required, but leave deep value validation to order creation.
- [x] 3.6 Add route-level tests for valid, invalid, stale, and Contact Price cart-line resolution.

## 4. Storefront Order Creation Route

- [x] 4.1 Add `POST /api/storefront/orders` under the storefront route namespace with public storefront CORS.
- [x] 4.2 Persist manual orders with initial `pending`, `pending`, and `unfulfilled` state.
- [x] 4.3 Generate a shopper-facing order number distinct from the internal database id.
- [x] 4.4 Return the order confirmation summary with id, order number, statuses, total amount, currency code, item count, and creation timestamp.
- [x] 4.5 Return validation or conflict errors for missing data, invalid products, invalid variants, Contact Price items, and customization mismatches.
- [x] 4.6 Update route contract and tests so valid checkout submissions do not include `payment.method`.

## 5. Public Storefront Order Lookup

- [x] 5.1 Add a public storefront order lookup endpoint requiring `orderNumber` and customer phone.
- [x] 5.2 Return shopper-safe order summary data only: statuses, totals, item summaries, limited customer/delivery summary, and customization value summaries.
- [x] 5.3 Do not return internal rendered design JSON, template snapshots, production internals, admin notes, or database IDs not needed by the shopper.
- [x] 5.4 Add route-level tests for successful lookup, wrong phone, missing order, and response data boundaries.

## 6. Admin Order Read APIs

- [x] 6.1 Add authenticated admin order list endpoint under `/api/admin/orders`.
- [x] 6.2 Add authenticated admin order detail endpoint under `/api/admin/orders/:orderNumber`.
- [x] 6.3 Return admin DTOs for order statuses, customer/address data, item snapshots, customization values with labels, and totals.
- [x] 6.4 Avoid raw DB dumps; return structured data shaped for the admin UI.
- [x] 6.5 Add route-level tests for auth/session/role checks, list response shape, detail response shape, and not-found cases.

## 7. Storefront Cart State And Product Detail Integration

- [x] 7.1 Add CartProvider and localStorage helpers for cart lines.
- [x] 7.2 Add tests for cart serialization, quantity edits, remove behavior, and cart-line merge rules.
- [x] 7.3 Wire product detail add-to-cart to require a concrete priced variant.
- [x] 7.4 Auto-select the only priced variant when a product has exactly one purchasable variant.
- [x] 7.5 Disable or replace add-to-cart with a contact CTA for Contact Price variants/products.
- [x] 7.6 Require customization values before adding customizable products to cart.
- [x] 7.7 Add quantity selection on product detail; default quantity is 1.
- [x] 7.8 Keep shopper on product detail after add-to-cart and update navbar cart count immediately.

## 8. Storefront Cart, Checkout, Confirmation, And Lookup UI

- [x] 8.1 Wire cart page to CartProvider, allow quantity edits and line removal, and hydrate lines with the cart resolver.
- [x] 8.2 Block checkout when cart is empty or has invalid/non-checkout-ready lines.
- [x] 8.3 Wire checkout as a single-page client-side submit flow using hydrated cart lines and customer/delivery form data.
- [x] 8.4 Remove shopper payment selection from checkout UI.
- [x] 8.5 On order creation success, clear the cart, store confirmation summary in sessionStorage, and navigate to `/order-confirmation?orderNumber=...`.
- [x] 8.6 Keep cart intact and show actionable errors when order creation fails.
- [x] 8.7 Add order confirmation rendering from sessionStorage with graceful reload behavior.
- [x] 8.8 Add `/order-lookup` route with order number and phone form.
- [x] 8.9 Add navbar/footer/confirmation links to order lookup.

## 9. Admin Orders UI Integration

- [x] 9.1 Replace admin orders list mock data with the authenticated backend order list API.
- [x] 9.2 Replace admin order detail mock data with the authenticated backend order detail API.
- [x] 9.3 Use order number in admin order detail route URLs.
- [x] 9.4 Show customization values and shopper-facing item snapshots read-only.
- [x] 9.5 Hide or disable mock-only capture/fulfill/cancel actions until a later status workflow change.

## 10. Documentation And Verification

- [x] 10.1 Update this change's `progress.md` and `session-handoff.md` with implementation evidence and restart notes.
- [x] 10.2 Run `pnpm --filter backend test`.
- [x] 10.3 Run `pnpm --filter backend check` and `pnpm --filter backend build`.
- [x] 10.4 Run storefront verification touched by cart/checkout wiring, including `pnpm --filter router-cf typecheck` and `pnpm --filter router-cf build`.
- [x] 10.5 Run admin verification touched by order UI wiring, including `pnpm --filter admin build`.
- [x] 10.6 Run `openspec validate storefront-orders --strict`.
- [x] 10.7 Run `./init.sh` before marking the change complete.
