# storefront-product-apis — Progress

**Status:** Complete ✓

## Summary

All 33 tasks implemented and verified.

### Backend (6 files changed/created)

- **`src/lib/cors.ts`** — Added `STOREFRONT_CORS_POLICY` (GET/OPTIONS, no credentials)
- **`src/app.ts`** — Mounted storefront CORS middleware and `storefrontProductsRoute`
- **`src/routes/storefront-products.ts`** — New route file with:
  - `GET /api/storefront/products` — Published-only listing with pagination, search (title/subtitle/handle/category name), category filtering by handle, price derivation (lowest variant price, `priceFrom`, Contact Price), thumbnail derivation (default variant → fallback), category summary, customizable flag
  - `GET /api/storefront/products/:handle` — Published product detail with full relations (type, categories, attributes, options+values, variants+media, product-owned customization), 404 for missing/non-published
- **`src/routes/storefront-products.test.ts`** — 12 unit tests for `buildListingItem()` covering all price/thumbnail/category/customization edges

### Storefront (8 files changed/created)

- **`app/lib/api.ts`** — New shared API client (`fetchStorefrontProducts`, `fetchStorefrontProduct`)
- **`app/lib/categories.ts`** — New stable category handle mapping (Vietnamese name → slug)
- **`app/routes/products.tsx`** — Replaced mock loader with `fetchStorefrontProducts` call
- **`app/routes/product.$handle.tsx`** — Replaced static mock lookup with `fetchStorefrontProduct`
- **`app/components/shared/ProductCard.tsx`** — Supports `priceAmount` (cents), Contact Price display, `thumbnail` fallback, `priceFrom` prefix
- **`app/components/products/FilterChips.tsx`** — Updated to `CategoryOption[]` shape with handle-based keys
- **`app/components/layout/Navbar.tsx`** — Category links use stable handles via `CATEGORY_HANDLES` mapping

### Verification

- Backend: `check` ✓, `build` ✓, `test` (19/19) ✓
- Storefront: `typecheck` ✓, `build` ✓
- `openspec validate --strict` ✓
- `./init.sh` ✓
