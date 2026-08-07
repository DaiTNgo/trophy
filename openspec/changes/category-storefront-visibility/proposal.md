## Why

Categories currently appear to be permanently active and public, so operators cannot prepare or retire a category without removing its catalog relationships. Product URLs can also depend on a category URL, which makes a product link fragile when that category is hidden. This change gives category visibility a real storefront contract and makes product detail URLs independent of category visibility.

## What Changes

- Add a persisted category visibility state with `Public` and `Hidden` values; new categories default to `Public`.
- Let admins view and edit category visibility, including for system categories; remove the separate placeholder `Status` state.
- Exclude hidden categories from storefront navigation, category listings, category filtering, and direct category routes (`404`).
- Keep product visibility independent: products assigned to hidden categories remain discoverable through other public surfaces or categories.
- **BREAKING** Make `/product/:productHandle` the canonical storefront product URL.
- Redirect legacy `/categories/:categoryHandle/products/:productHandle` URLs to the canonical product URL.
- Show only public category breadcrumbs/links on product detail pages.

## Capabilities

### New Capabilities

- `category-storefront-visibility`: Persist and enforce public/hidden visibility for admin and storefront category surfaces.
- `product-canonical-links`: Keep product detail links independent of category visibility and redirect the legacy category-scoped URL.

### Modified Capabilities

<!-- No existing OpenSpec capabilities are present in this repository. -->

## Impact

- Admin category create, list, detail, and edit flows.
- Backend D1 schema, admin category routes, storefront category routes, and storefront product queries.
- Storefront route helpers, product cards, breadcrumbs, category product routes, and related tests.
- Existing category records require a default visibility value during the contract change; no migration artifact is planned unless implementation discovers a required environment-specific schema operation.
