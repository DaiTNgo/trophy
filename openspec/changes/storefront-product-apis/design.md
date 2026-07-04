## Context

The storefront product listing and detail routes currently use mock product data. The backend already owns product persistence, product status, product variants, ordered variant media, category links, attributes, and product-owned customization data, but the existing `/api/products` route is an Admin Product Catalog boundary.

ADR `0002-storefront-product-api-boundary` chooses a separate public storefront API namespace because public visibility and response shape should not depend on every caller remembering to pass the right admin filters. The domain glossary defines Storefront Product Listing, Storefront Product Search, Admin Product Catalog, and Contact Price as distinct concepts.

## Goals / Non-Goals

**Goals:**

- Add public, credential-free storefront product listing and detail APIs under `/api/storefront/products`.
- Enforce published-only visibility in the backend for every storefront product response.
- Support listing pagination, category filtering by stable category handle, and product text search in one listing endpoint.
- Return a compact listing read model that supports storefront grids without over-fetching full variants or customization documents.
- Return a richer detail read model by product handle for product detail pages and customizable product rendering.
- Replace storefront product listing and detail mock data with route loader calls to the public API.
- Add route-level backend tests at the public HTTP seam.

**Non-Goals:**

- Reworking the Admin Product Catalog API.
- Changing product publishing rules, product create/edit flows, or admin product forms.
- Adding full-text ranking, typo tolerance, suggestions, or cross-content search.
- Adding facets beyond `q`, `category`, `page`, and `limit`.
- Adding shopper authentication, personalized pricing, cart, checkout, or order APIs.
- Adding image resizing, CDN processing, or generated thumbnails.

## Decisions

### Use a storefront route namespace

Add a backend route namespace mounted at `/api/storefront`, with product endpoints under `/api/storefront/products`.

Alternative considered: reuse `/api/products` with required `status=published` filters. This was rejected because public visibility would rely on caller discipline and the response shape would continue to mix admin and storefront needs.

### Keep storefront product APIs public

Storefront product APIs use no auth, no cookies, and no credentials. CORS should allow storefront origins and only public read methods.

Alternative considered: reuse the existing product CORS policy. This was rejected because that policy includes credentials and admin write methods that are unnecessary for public browsing.

### Make search a listing query mode

`q` stays on `GET /api/storefront/products` and searches product title, subtitle, handle, and category name. This keeps product grids, category pages, and search pages on one Storefront Product Listing contract.

Alternative considered: add a separate storefront search endpoint. This was rejected for now because search is limited to published product browsing fields. A separate search API becomes useful only when search spans products, categories as standalone results, content pages, suggestions, or ranking infrastructure.

### Use category handles for filtering

The `category` query parameter should match category handles. Storefront URLs should not depend on mutable display names. Search can still match category names.

Alternative considered: accept display names because the current mock UI uses Vietnamese category names in query strings. That is easier initially but makes URLs less stable. The implementation can map current UI labels to handles as part of replacing mock data.

### Derive listing price from variants

Listing `priceAmount` is the lowest non-null variant price. `priceFrom` is true when the product has multiple variants or multiple public prices that make the displayed amount a starting price. If no variant has a price, `priceAmount` is `null`, representing Contact Price.

Alternative considered: use the default variant price. That was rejected because product browsing usually needs the lowest visible starting price.

### Derive listing thumbnail from ordered variant media

Listing thumbnail uses the first media item of the default variant. If the default variant has no media, it falls back to the first media item from the first variant that has media. If no variant media exists, thumbnail is `null`.

Alternative considered: use product-level media. That would ignore the product-owned customization direction where variant media is the shopper-facing product background source.

### Keep listing compact and detail rich

The listing endpoint returns enough data for cards and filters. Full variants, option values, attributes, and product-owned customization data belong on the detail endpoint by handle.

Alternative considered: return the full product graph in listing responses. This was rejected because listing grids should stay lightweight and should not over-fetch customization documents.

## Risks / Trade-offs

- **Current storefront query strings use category names** → Map UI category controls to handles when wiring loaders, or accept a temporary compatibility mapping inside the loader without changing the backend public contract.
- **No generated thumbnails** → Listing cards may use original uploaded asset content URLs. Keep this acceptable for the first API pass and leave image transformation/CDN work out of scope.
- **Search is simple SQL matching** → Results may be broad or unranked. Keep behavior predictable and defer ranking/full-text search until search scope expands.
- **Published products with incomplete media can produce `thumbnail: null`** → Storefront cards must render a placeholder. Backend should not crash on imperfect legacy data.
- **Detail includes customization data from the product-owned model** → Implementation must avoid reintroducing standalone customization template or revision lifecycle into storefront product APIs.

## Migration Plan

1. Add the backend storefront product route and public CORS policy.
2. Implement listing and detail read helpers over existing product, category, variant, media, attribute, option, and product customization tables.
3. Add backend route tests for visibility, search, filtering, pagination, price, thumbnail, detail, and customization data.
4. Wire storefront product listing and detail loaders to the new public endpoints.
5. Remove product listing/detail mock data paths that are replaced by the API.
6. Verify backend tests, backend check/build, storefront typecheck/build, OpenSpec validation, and the root verification entrypoint before marking complete.

Rollback is straightforward while the storefront still has mock data, but after loader wiring the public API becomes required for product pages in local and deployed environments.
