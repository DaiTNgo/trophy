# Storefront Orders Progress

## Current State

- Implemented the backend half of `storefront-orders` on 2026-07-05:
  - public `POST /api/storefront/orders` no longer requires shopper `payment.method`;
  - customer phone is normalized for create and lookup;
  - public cart-line resolver lives under `/api/storefront/orders/resolve`;
  - public storefront order lookup lives under `/api/storefront/orders/lookup`;
  - authenticated admin order list/detail live under `/api/admin/orders` and `/api/admin/orders/:orderNumber`;
  - route-surface coverage was added for storefront create/resolve/lookup and admin order read APIs.
- Implemented the storefront shopper flow:
  - browser-owned `CartProvider` with localStorage persistence;
  - cart helper logic now lives in a pure helper module with Vitest coverage for serialization, merge, quantity edit, and remove behavior;
  - product detail add-to-cart uses selected priced variant, quantity, and required customization values;
  - Contact Price variants now route to a dedicated `/contact` inquiry page with the current product/variant context in the URL instead of reusing generic fallback UI;
  - cart page hydrates browser lines through the backend resolver, allows quantity edits/removal, and blocks invalid checkout;
  - checkout is now a client-side single-page submit flow with no payment selection;
  - successful checkout clears the cart, stores confirmation summary in sessionStorage, and redirects to `/order-confirmation?orderNumber=...`;
  - order confirmation degrades gracefully on reload;
  - `/order-lookup` route was added and linked from navbar, footer, and confirmation.
- Implemented the admin visibility slice:
  - orders list reads backend data instead of mock orders;
  - order detail reads backend snapshots by `orderNumber`;
  - mock capture/fulfill/cancel actions were removed from the UI in favor of read-only backend visibility.
- Verification on the current worktree:
  - `pnpm --dir apps/storefront test`
  - `pnpm --filter backend test`
  - `pnpm --filter backend check`
  - `pnpm --filter backend build`
  - `pnpm --dir apps/storefront typecheck`
  - `pnpm --filter router-cf build`
  - `pnpm --filter admin build`
  - `openspec validate storefront-orders --strict`
  - `./init.sh`

## Next Step

- Archive the change after review if no further UX polish is needed.

## Blockers

- None.

## Open Assumptions

- Currency remains `VND`.
- Checkout does not include online payment or shopper-selected payment method.
- Contact Price products use a separate contact/inquiry flow, not cart or order creation.
- Cart is browser-owned; no customer account or server-side cart is introduced in this change.
- Admin status transitions and production review/export workflows are out of scope for this change.
