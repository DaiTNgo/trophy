# Session Handoff — storefront-product-apis

## State

All 33/33 tasks complete. Change is ready for archive.

## What was built

Three layers:

1. **Backend storefront product APIs** (`/api/storefront/products` and `/api/storefront/products/:handle`) — public, published-only, no auth, with search, category filtering, pagination, price/thumbnail derivation, and full detail with customization data.

2. **Backend route tests** — 12 unit tests for listing item building logic (prices, thumbnails, categories, customization).

3. **Storefront integration** — New API client module, stable category handle mapping, updated listing/detail loaders to call real APIs, Contact Price rendering in ProductCard, Navbar links using handles.

## Key files

| File | Purpose |
|---|---|
| `apps/backend/src/routes/storefront-products.ts` | Backend storefront route handlers + `buildListingItem` export |
| `apps/backend/src/routes/storefront-products.test.ts` | Listing builder tests |
| `apps/backend/src/lib/cors.ts` | `STOREFRONT_CORS_POLICY` |
| `apps/backend/src/app.ts` | Route mounting |
| `apps/storefront/app/lib/api.ts` | Storefront API client |
| `apps/storefront/app/lib/categories.ts` | Category name→handle mapping |
| `apps/storefront/app/routes/products.tsx` | Updated listing loader |
| `apps/storefront/app/routes/product.$handle.tsx` | Updated detail loader |
| `apps/storefront/app/components/shared/ProductCard.tsx` | Contact Price + priceAmount support |
| `apps/storefront/app/components/products/FilterChips.tsx` | CategoryOption shape |
| `apps/storefront/app/components/layout/Navbar.tsx` | Handle-based category links |

## Not done / out of scope

- `BestSellersSection` on home page still uses the old `data/products.ts` mock file. This is outside the listing/detail scope.
- Mock product data in `data/products.ts` is retained for the same reason.
- No generated image thumbnails or CDN processing (non-goal).
- No full-text ranking, typo tolerance, or suggestions (non-goal).
- Admin product catalog APIs are unchanged (non-goal).
