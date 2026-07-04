## 1. Backend Route Boundary

- [x] 1.1 Add a public storefront CORS policy for read-only storefront APIs with no credentials.
- [x] 1.2 Add a backend storefront route namespace mounted under `/api/storefront`.
- [x] 1.3 Add `GET /api/storefront/products` and `GET /api/storefront/products/:handle` route handlers.
- [x] 1.4 Ensure storefront product routes require no auth/session and never use admin product route handlers directly.

## 2. Storefront Listing Read Model

- [x] 2.1 Add listing query validation for `q`, `category`, `page`, and `limit`.
- [x] 2.2 Implement published-only listing selection with pagination metadata.
- [x] 2.3 Implement text search over product title, subtitle, handle, and category name.
- [x] 2.4 Implement category filtering by category handle.
- [x] 2.5 Build compact listing items with id, title, subtitle, handle, category/type summary, and customizable state.
- [x] 2.6 Derive listing price from the lowest non-null variant price and expose Contact Price as `priceAmount: null`.
- [x] 2.7 Derive listing thumbnail from default variant first media with fallback to the first variant that has media.

## 3. Storefront Detail Read Model

- [x] 3.1 Implement published product lookup by handle with not-found behavior for missing or non-published products.
- [x] 3.2 Return detail fields for description, attributes/specs, options, variants, option values, and ordered variant media.
- [x] 3.3 Include product-owned customization data for customizable products without standalone template/revision lifecycle fields.
- [x] 3.4 Preserve persisted variant media order in detail responses.

## 4. Backend Tests

- [x] 4.1 Add route-level tests for published-only listing and exclusion of draft/archived products.
- [x] 4.2 Add route-level tests for search across title, subtitle, handle, and category name.
- [x] 4.3 Add route-level tests for category handle filtering and pagination metadata.
- [x] 4.4 Add route-level tests for listing price, `priceFrom`, and Contact Price behavior.
- [x] 4.5 Add route-level tests for thumbnail fallback behavior.
- [x] 4.6 Add route-level tests for detail lookup by handle, unpublished not-found behavior, ordered media, and customization summary.

## 5. Storefront Integration

- [x] 5.1 Add a storefront backend client/helper for public product API calls.
- [x] 5.2 Replace the product listing route mock loader with the public listing API.
- [x] 5.3 Map storefront category controls to stable category handles instead of display-name filters.
- [x] 5.4 Replace the product detail route mock loader with the public detail API.
- [x] 5.5 Render Contact Price products with a contact action instead of a numeric price.
- [x] 5.6 Remove product listing/detail mock data paths that are no longer used.

## 6. Documentation And Verification

- [x] 6.1 Update this change's progress and session handoff with implementation notes.
- [x] 6.2 Run backend route tests.
- [x] 6.3 Run `pnpm --filter backend check` and `pnpm --filter backend build`.
- [x] 6.4 Run `pnpm --filter router-cf typecheck` and `pnpm --filter router-cf build`.
- [x] 6.5 Run `openspec validate storefront-product-apis --strict`.
- [x] 6.6 Run `./init.sh` before marking the change complete.
