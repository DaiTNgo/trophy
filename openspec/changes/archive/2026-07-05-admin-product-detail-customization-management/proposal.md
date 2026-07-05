## Why

`product-owned-customization` moved creation and storefront rendering to product-owned customization, but admin product detail still needs to become the reliable place where an operator can view and edit the product after creation. This change closes that gap by making product detail backend-backed and by adding a Medusa-style detail section for product customization management.

## What Changes

- Replace admin product detail's mock/local catalog source of truth with backend reads from the admin product route surface.
- Redirect successful create-product submissions to the created product's detail page instead of returning to the product list.
- Add a product detail Customization section that shows whether customization is enabled, the canvas size, layer/form-field counts, and readiness issues based on variant media.
- Add a section action that opens a full-screen/route editor for product customization instead of reusing the create wizard or forcing the full editor into a small drawer.
- Add section-specific backend saves for product detail management; `full-create` remains create-only.
- Add an admin product customization update endpoint for enabling, disabling, and saving product-owned customization on an existing product.
- Enforce customization readiness on published products when saving changes that touch variant media or customization. Draft products may save incomplete customization state.
- Allow admins to enable or disable customization after product creation from the product detail Customization section.
- Initialize newly enabled customization from the default editor template, with canvas dimensions derived from the first available variant image.

## Capabilities

### New Capabilities

- `admin-product-detail-customization-management`: Backend-backed product detail reads, section-specific saves, product detail customization viewing/editing, published-product readiness enforcement, and create-to-detail navigation.

### Modified Capabilities

None.

## Impact

- `apps/backend`: admin product read/update routes, product customization update route, readiness validation for published product edits, and route-level API contract tests.
- `apps/admin`: product list/detail data loading, create success redirect, product detail sections, customization section, full-screen customization editor route, product metadata mapping, and removal of product detail dependence on `useCatalog`/localStorage for persisted products.
- `packages/customization`: may reuse existing default template and validation helpers; no new standalone template lifecycle should be introduced.
- OpenSpec state for `product-owned-customization` remains unchanged; this is a follow-up change.
