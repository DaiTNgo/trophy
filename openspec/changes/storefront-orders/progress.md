# Storefront Orders Progress

## Current State

- Implementation complete for the OpenSpec change `storefront-orders`.
- Added Drizzle schema tables `orders` and `order_items` with snapshots for prices, customization, and backgrounds.
- Implemented `POST /api/storefront/orders` route in `apps/backend/src/routes/storefront/orders.ts` with strict validation.
- Validated all backend business logic (customer/shipping/payment data, pricing snapshots, variant validations, customization checks) and contract endpoints using Vitest.
- Mocked Storefront UI in `apps/storefront` is wired up to correctly post to the API in `checkout.tsx` and redirect to `order-confirmation.tsx` upon success. Contact Price products have their add-to-cart buttons disabled.
- `./init.sh` verification passes perfectly across all 5 workspace projects.

## Next Step

- Archive the OpenSpec change via `/openspec-archive-change` or move on to the next feature.

## Blockers

- None.

## Open Assumptions

- Currency is `VND`.
- Online payment integration is out of scope.
- Contact Price products use a separate contact/inquiry flow, not order creation.
- The storefront cart uses mocked state (submitting hardcoded values) because it currently runs mock-first without a real global store, matching the admin app's behavior.
