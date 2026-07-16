# Storefront Recently Viewed Cart Implementation Plan

## Scope

Implement the approved storefront-only recently viewed flow:

- persist a minimal recent-view snapshot on successful product detail page load
- render a `Sản phẩm đã xem gần đây` block in cart
- keep persistence in `localStorage`
- do not change backend contracts

## Implementation Steps

### 1. Add a storefront recent-view helper

Create `apps/storefront/app/lib/recently-viewed.ts`.

Responsibilities:

- define the storage key and limits
- define the snapshot type used by storefront
- read and parse storage safely
- validate item shape before returning results
- upsert a viewed product by moving duplicates to the front
- cap the stored list at 8 items
- expose a small read/write API for PDP and cart

Planned API shape:

- `getRecentlyViewedProducts()`
- `recordRecentlyViewedProduct(product)`

## 2. Add unit coverage for the helper

Add a focused test file next to the helper or alongside existing storefront lib tests.

Cover:

- storing a new product
- moving an existing product to the front
- enforcing the max item count
- ignoring malformed JSON
- ignoring malformed items

Keep these tests local to the helper and independent from route rendering.

## 3. Record recent views from the PDP

Update `apps/storefront/app/routes/product.$handle.tsx`.

Add a client-only `useEffect` that records the current product after loader data is available.

Snapshot contents:

- `product.id`
- `product.handle`
- localized `product.title`
- a representative image, preferring current PDP thumbnail/media
- selected/default display price source for the product card
- current timestamp

Constraints:

- run only on the client
- avoid duplicate writes during the same render pass
- fail silently if storage is unavailable

## 4. Add a compact cart component

Create `apps/storefront/app/components/cart/RecentlyViewedProducts.tsx`.

Responsibilities:

- render the cart-local section title
- render up to 4 compact linked product cards
- reuse storefront image, title, and price formatting patterns
- stay visually secondary to the main cart and summary content

This component should stay presentational and receive already filtered items.

## 5. Read and filter recent views in cart

Update `apps/storefront/app/routes/cart.tsx`.

Add client-side state/effect to:

- load recent-view items after mount
- build a set of product ids already present in the cart
- exclude items already in cart
- limit remaining items to 4

Render the new cart component only when filtered items exist.

## 6. Add a light cart rendering test if setup is clean

Only add this if the current storefront test setup supports it without broad new harness work.

Suggested coverage:

- section renders when recent items are available
- section stays hidden when no eligible items remain
- items already in cart are excluded

If this test is skipped, record the reason in progress tracking when implementation is done.

## File Touch List

Expected files:

- `apps/storefront/app/lib/recently-viewed.ts`
- `apps/storefront/app/lib/recently-viewed.test.ts` or equivalent
- `apps/storefront/app/routes/product.$handle.tsx`
- `apps/storefront/app/components/cart/RecentlyViewedProducts.tsx`
- `apps/storefront/app/routes/cart.tsx`

State updates after implementation:

- `feature_list.json`
- `progress.md`
- `session-handoff.md`

## Verification

Minimum implementation verification:

- `pnpm --filter router-cf test` if the touched test files are covered by the storefront runner
- `pnpm --filter router-cf typecheck`
- `pnpm --filter router-cf build`

Repository-level verification target before claiming done:

- `./init.sh`

## Execution Notes

- Keep the stored payload minimal and localized for current display needs
- Do not introduce app-wide context for this feature
- Prefer a helper-owned normalization boundary instead of duplicating storage parsing logic in components
- Filter cart duplicates by `productId`
- If PDP image selection is ambiguous, prefer the first valid display image already rendered for the product

## Definition Of Done For This Feature

- PDP writes recent views successfully on shopper product visits
- Cart renders the approved `Sản phẩm đã xem gần đây` section from stored data
- Cart excludes products already present in the cart
- Helper behavior is covered by focused tests
- Storefront typecheck and build pass
- Repo state files are updated when code implementation is complete
