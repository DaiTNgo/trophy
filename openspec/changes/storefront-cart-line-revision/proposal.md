## Why

Shoppers can currently enter customization values and add a product to the browser cart, but cannot revisit the rendered choice from the cart without re-entering those values. They need a low-friction way to reopen a customized choice, compare alternatives such as different recipient names, and keep only the cart lines they intend to purchase.

## What Changes

- Add a `Xem lai va chinh sua` cart action for every customizable cart line, including lines that are no longer checkout-ready.
- Reopen the normal product detail page with the source cart line's variant and customization values restored from the browser cart; all ordinary PDP controls remain available.
- Treat the reopened session as a Cart Line Revision: it starts at quantity one and, when added, always creates a separate cart line even when product, variant, and customization values match an existing line.
- Revalidate restored selections against the current published product and customization template. Retain compatible values, require corrections for invalid values, and leave the source cart line unchanged.
- Preserve the current PDP post-add behavior: remain on the product page after adding the revision.

## Capabilities

### New Capabilities
- `storefront-cart-line-revision`: Restore a customized cart line into a normal storefront product-detail session and add it back as an independent cart line.

### Modified Capabilities

- None.

## Impact

- `apps/storefront/app/routes/cart.tsx`: render the cart revision entry action.
- `apps/storefront/app/routes/categories.$categoryHandle.products.$productHandle.tsx` and `apps/storefront/app/routes/product.$handle.tsx`: restore revision state and preserve it across the generic product redirect.
- `apps/storefront/app/lib/cart.ts`, `apps/storefront/app/hooks/use-cart.tsx`, and their tests: represent the one-time independent-add behavior without changing ordinary cart-line merging.
- Storefront browser-cart persistence and client routing only; no backend API, database, checkout contract, or order snapshot change.
