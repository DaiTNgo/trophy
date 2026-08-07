## Why

Admin collections currently have no real storefront visibility state, so operators cannot prepare or retire a collection without deleting it or changing its product assignments. The admin product list also needs a clear, reliable path from a product name to its product detail page as part of the same catalog-management experience.

## What Changes

- Add a persisted collection visibility state with `Public` and `Hidden` values; new collections default to `Public`.
- Show and edit collection visibility in admin collection list, detail, create, and edit flows.
- Remove any non-functional collection status concept; visibility is the only shopper-facing state.
- Exclude hidden collections from desktop/mobile storefront navigation and collection listing/filter data.
- Make `/collections/:handle` return `404` for hidden collections.
- Keep products assigned to hidden collections available through their own product detail, search, and other public collections.
- Ensure the admin product list uses the product name as a link to `/products/:id`, while keeping row action menus independent.

## Capabilities

### New Capabilities

- `collection-storefront-visibility`: Persist and enforce public/hidden visibility for admin and storefront collection surfaces.
- `admin-product-detail-navigation`: Provide stable name-link navigation from the admin product list to product detail.

### Modified Capabilities

<!-- No existing OpenSpec capabilities are present in this repository. -->

## Impact

- Admin collection create/list/detail/edit screens and admin product list UI.
- Backend D1 schema and admin collection route contracts.
- Storefront collection route, collection API responses, desktop/mobile navigation, and collection listing/filter data.
- Backend and frontend tests for visibility behavior, direct hidden collection routes, product preservation, and admin product navigation.
- Existing collection records require a default visibility value; no migration artifact is planned unless implementation discovers an environment-specific schema requirement.
