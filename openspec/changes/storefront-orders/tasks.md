## 1. Order Data Model

- [x] 1.1 Add backend order, order item, and order snapshot tables to the Drizzle schema.
- [x] 1.2 Model manual order statuses, payment statuses, fulfillment statuses, payment methods, and item production statuses with narrow string unions.
- [x] 1.3 Store customer details, primary address snapshot, optional different shipping address snapshot, and order totals on the order record.
- [x] 1.4 Store per-item product snapshot, variant snapshot, unit price snapshot, line subtotal, selected background snapshot, and optional customization snapshot JSON.

## 2. Backend Validation And Snapshot Helpers

- [x] 2.1 Add a storefront order creation request schema for customer, shipping, manual payment, and multi-item payloads.
- [x] 2.2 Add product and variant lookup helpers that require published products and validate variant ownership.
- [x] 2.3 Add price validation that rejects variants with `priceAmount: null` and calculates order totals from backend prices.
- [x] 2.4 Add customization validation that requires values for customizable products and rejects values for non-customizable products.
- [x] 2.5 Build customized item snapshots by validating shopper values, constructing the selected variant background, and creating a backend-rendered design snapshot.
- [x] 2.6 Ensure multi-item submissions validate fully before persistence or run in a transaction so failures create no partial orders.

## 3. Storefront Order Route

- [x] 3.1 Add `POST /api/storefront/orders` under the storefront route namespace with public storefront CORS.
- [x] 3.2 Persist manual-payment orders with initial `pending`, `pending`, and `unfulfilled` state.
- [x] 3.3 Generate a shopper-facing order number distinct from the internal database id.
- [x] 3.4 Return the order confirmation summary with id, order number, statuses, total amount, currency code, item count, and creation timestamp.
- [x] 3.5 Return validation or conflict errors for missing data, invalid products, invalid variants, Contact Price items, and customization mismatches.

## 4. Backend Contract Tests

- [x] 4.1 Add route-level tests for successful single-item and multi-item order creation.
- [x] 4.2 Add route-level tests for primary address and different shipping address validation.
- [x] 4.3 Add route-level tests for accepted manual payment methods and rejected unsupported payment methods.
- [x] 4.4 Add route-level tests proving backend price snapshots are used and Contact Price items are rejected.
- [x] 4.5 Add route-level tests for missing/unpublished products and variants that do not belong to the submitted product.
- [x] 4.6 Add route-level tests for required customization values, rejected customization on non-customizable products, and invalid customization values.
- [x] 4.7 Add route-level tests asserting stored item snapshots and production statuses for customized and non-customized items.

## 5. Storefront Integration

- [x] 5.1 Add a storefront API client helper for creating orders.
- [x] 5.2 Wire checkout submission to send customer, shipping, payment, and all cart items to the backend route.
- [x] 5.3 Ensure storefront does not offer add-to-cart or checkout actions for Contact Price products.
- [x] 5.4 Route successful submissions to order confirmation using the returned order number.

## 6. Documentation And Verification

- [ ] 6.1 Update this change's `progress.md` and `session-handoff.md` with implementation evidence and restart notes.
- [ ] 6.2 Run `pnpm --filter backend test`.
- [ ] 6.3 Run `pnpm --filter backend check` and `pnpm --filter backend build`.
- [ ] 6.4 Run storefront verification touched by checkout wiring, including `pnpm --filter router-cf typecheck` and `pnpm --filter router-cf build` when storefront files change.
- [ ] 6.5 Run `openspec validate storefront-orders --strict`.
- [ ] 6.6 Run `./init.sh` before marking the change complete.
