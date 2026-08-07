## 1. Category Data Contract

- [x] 1.1 Add the persisted `public`/`hidden` category visibility field to the backend product-category schema with a public default.
- [x] 1.2 Update backend category create, list, and update validation/serialization to accept and return visibility, including system categories.
- [x] 1.3 Add backend route tests for public defaults, hidden/public updates, invalid visibility values, missing categories, and system-category visibility updates.

## 2. Admin Category Management

- [x] 2.1 Add visibility selection to the category create flow with `Public` as the default.
- [x] 2.2 Replace hardcoded category status/visibility displays in the category list with the persisted visibility state and remove the placeholder Status column/control.
- [x] 2.3 Make category detail/edit visibility editable for both normal and system categories, while preserving existing system-category identity restrictions.
- [x] 2.4 Add admin UI tests or focused verification for create, list, and edit visibility behavior.

## 3. Storefront Category Visibility

- [x] 3.1 Filter hidden categories from storefront category API responses used by navigation and category filters.
- [x] 3.2 Enforce hidden-category `404` behavior for direct category routes and category-filtered product requests.
- [x] 3.3 Ensure hidden category relationships remain stored and products remain discoverable through public categories, collections, search, and direct product publication rules.
- [x] 3.4 Add storefront/backend contract tests covering navigation exclusion, filter exclusion, direct `404`, public-category product discovery, and hidden-category relationship preservation.

## 4. Canonical Product URLs

- [x] 4.1 Update storefront path helpers and all product cards/search/collection/category/cart-related links to use `/product/:productHandle` as the canonical product URL.
- [x] 4.2 Redirect legacy `/categories/:categoryHandle/products/:productHandle` requests to the canonical product route without rendering hidden category context.
- [x] 4.3 Filter hidden categories from product-detail breadcrumb/category links while keeping publicly available products renderable without a public category.
- [x] 4.4 Add route and component tests for canonical links, legacy redirects, hidden-category breadcrumb omission, and products with only hidden categories.

## 5. Verification and State

- [x] 5.1 Run backend route/service tests, backend check/build, admin build, storefront typecheck/build, and `./init.sh`.
- [x] 5.2 Update this change's `progress.md` and `session-handoff.md` with implementation status, verification evidence, and any schema/environment assumptions.
