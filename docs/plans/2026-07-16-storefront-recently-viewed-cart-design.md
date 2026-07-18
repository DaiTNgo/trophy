# Storefront Recently Viewed Products In Cart

## Context

Storefront product detail pages already have the data needed to identify a product a shopper actually viewed. The cart page is the right place to surface those recently viewed products because it gives shoppers a lightweight path back into browsing without interrupting the purchase flow with extra actions.

This pass is intentionally narrow:

- record recently viewed products on successful PDP load
- show those products in the storefront cart page
- keep the solution client-only with `localStorage`
- avoid backend or API contract changes

## Goals

- Remember shopper product views in storefront local storage
- Show a compact `Sản phẩm đã xem gần đây` section in cart
- Keep the stored payload small and stable
- Avoid duplicate entries and avoid showing items already present in cart

## Non-Goals

- No backend persistence or account-linked history
- No carousel or advanced merchandising treatment
- No add-to-cart CTA in the recently viewed block
- No variant-specific recently viewed state in this pass

## Recommended Approach

Use a small storefront helper that writes a recent-view snapshot to `localStorage` when `/product/:handle` loads successfully on the client. The cart page reads from the same helper after mount and renders a compact product grid only when data exists.

This keeps responsibility split cleanly:

- PDP owns writing "a product was actually viewed"
- Cart owns reading and presenting that history

This is the smallest approach that matches the approved behavior and does not add unnecessary app-wide state.

## Data Model

Store each recently viewed product as a minimal snapshot:

- `productId`
- `handle`
- `title`
- `thumbnail`
- `priceAmount`
- `viewedAt`

Storage key:

- `trophy:recently-viewed-products`

Storage rules:

- newest item first
- dedupe by `productId`, with `handle` as a defensive fallback
- cap storage at 8 items
- ignore malformed or incomplete entries when reading

## Data Flow

### Product detail page

`apps/storefront/app/routes/product.$handle.tsx` will call a client-side helper in an effect after loader data is available. The helper will persist the current product snapshot into `localStorage`.

The write should happen only on the client and should fail silently if storage is unavailable or malformed.

### Cart page

`apps/storefront/app/routes/cart.tsx` will load recently viewed products after mount, then render a cart-local section using a small dedicated component.

Display rules:

- show at most 4 recent products in cart
- sort by most recent first
- hide products that are already present in the cart
- render nothing when no recent products remain after filtering

## UI Design

Add a compact section in the cart page:

- section title: `Sản phẩm đã xem gần đây`
- simple grid of product cards
- each card includes:
  - image
  - product title
  - price
  - link back to `/product/:handle`

Pass-one UI constraints:

- no `Add to cart` button
- no variant badge or selected option state
- no carousel behavior

The block should visually fit the existing storefront cart surface and stay secondary to the checkout summary.

## Code Shape

Add a new helper:

- `apps/storefront/app/lib/recently-viewed.ts`

Responsibilities:

- read and validate storage state
- serialize and persist a new recent-view item
- dedupe and cap the list
- expose a small API that cart and PDP can share

Add a new cart component:

- `apps/storefront/app/components/cart/RecentlyViewedProducts.tsx`

Responsibilities:

- receive recent items already filtered for display
- render the compact grid UI for cart

## Error Handling

- Guard all storage access with `typeof window !== "undefined"`
- Treat JSON parse failures as empty state
- Treat storage write failures as non-fatal
- Do not show shopper-facing error UI for this feature

This feature is a progressive enhancement. If storage fails, cart and PDP must continue working normally.

## Testing

### Unit tests

Add helper tests for:

- appending a new product
- moving an existing product to the front on re-view
- enforcing the 8-item cap
- returning empty state for malformed JSON
- dropping malformed items during read

### Cart UI test

If the current storefront test setup supports it cleanly, add a light component test for:

- section renders when recent items exist
- section does not render when there are no recent items
- products already in the cart are excluded

No backend tests are needed because this feature does not change backend behavior or route contracts.

## Risks And Mitigations

- `localStorage` is client-only:
  - mitigate by loading recent items after mount
- stale product snapshots may drift from current catalog data:
  - acceptable for this pass because the block is navigational, not transactional
- duplicated content in cart:
  - mitigate by filtering out products already present in the cart

## Implementation Notes

- Keep the snapshot narrow and do not store full PDP payloads
- Prefer using the current localized title available in PDP loader data
- Reuse existing storefront price formatting helpers
- Keep the recent-view helper independent from cart persistence logic

## Acceptance Criteria

- Visiting a product detail page records the product in storefront local storage
- Re-visiting the same product updates its recency instead of creating a duplicate
- Cart shows a `Sản phẩm đã xem gần đây` section when eligible products exist
- Cart shows at most 4 recently viewed products
- Products already present in cart do not appear in the recently viewed section
- Storage failures do not break PDP or cart behavior
