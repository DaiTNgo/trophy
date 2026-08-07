## 1. Collection Data Contract

- [x] 1.1 Add the persisted `public`/`hidden` collection visibility field to the backend product-collection schema with a public default.
- [x] 1.2 Update backend collection create, list, and update validation/serialization to accept and return visibility.
- [x] 1.3 Add backend route tests for public defaults, hidden/public updates, invalid visibility values, and missing collections.

## 2. Admin Collection Management

- [x] 2.1 Add visibility selection to the collection create flow with `Public` as the default.
- [x] 2.2 Display persisted visibility in the admin collections list and remove any placeholder status behavior.
- [x] 2.3 Add editable visibility to the collection detail/edit flow and persist it with existing metadata saves.
- [x] 2.4 Add focused admin verification for create, list, detail, and edit visibility behavior.

## 3. Storefront Collection Visibility

- [x] 3.1 Filter hidden collections from the storefront collection API used by desktop and mobile navigation.
- [x] 3.2 Filter hidden collections from storefront collection listing/filter data.
- [x] 3.3 Enforce `404` for direct hidden collection routes and hidden collection product queries.
- [x] 3.4 Preserve collection-product relationships and product visibility when a collection is hidden.
- [x] 3.5 Add backend/storefront contract tests for navigation exclusion, listing exclusion, direct `404`, public collection discovery, and product preservation.

## 4. Admin Product Navigation

- [x] 4.1 Verify or restore the admin product-name link to `/products/:id` in the product list.
- [x] 4.2 Keep product row action menus independent from the product-name link and add focused UI verification.

## 5. Verification and State

- [x] 5.1 Run backend route/service tests, backend check/build, admin build, storefront typecheck/build, and `./init.sh`.
- [x] 5.2 Update this change's `progress.md` and `session-handoff.md` with implementation status, verification evidence, and schema/environment assumptions.
