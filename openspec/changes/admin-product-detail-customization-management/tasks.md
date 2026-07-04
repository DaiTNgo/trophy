## 1. Backend Product Detail Contracts

- [x] 1.1 Add or confirm route-level contract coverage for `GET /api/admin/products` and `GET /api/admin/products/:id` returning backend product list/detail data needed by admin product management.
- [x] 1.2 Add a product customization update route for enabling, disabling, and saving product-owned customization on an existing product.
- [x] 1.3 Add helper coverage for deriving default customization canvas dimensions from ordered variant media when enabling customization after creation.
- [x] 1.4 Add readiness validation so published customizable products reject variant media or customization saves that would break Customization Publish Readiness.
- [x] 1.5 Add route-level tests for draft products saving incomplete customization state and returning readable readiness issues.
- [x] 1.6 Add route-level tests for published product conflicts: missing variant media, mismatched image dimensions, and invalid customization editor model.
- [x] 1.7 Ensure disabling customization removes shopper customization behavior while allowing a published product to remain published.

## 2. Admin Product Data Client

- [x] 2.1 Extend the admin products client with backend product list, product detail, section update, publish/archive, and customization update functions.
- [x] 2.2 Map backend product read models into the admin product detail UI state, including variants, ordered variant media, organization data, attributes, and customization summary.
- [x] 2.3 Replace product list reads with backend admin product catalog data and preserve search/filter behavior.
- [x] 2.4 Remove product detail dependence on `useCatalog` and browser-local product state for persisted products.

## 3. Admin Product Detail Sections

- [x] 3.1 Update product detail loading, loading/error/not-found states, and reload behavior around `GET /api/admin/products/:id`.
- [x] 3.2 Wire overview saves to the product overview update route and refresh detail state from the response.
- [x] 3.3 Wire organization saves to the organize route and refresh detail state from the response.
- [x] 3.4 Wire attributes, options, variants, publish, and archive actions through section-specific backend routes where already available.
- [x] 3.5 Add a Customization section that displays enabled state, canvas size, layer count, form field count, and readiness issues.
- [x] 3.6 Add enable and disable customization actions in the Customization section.
- [x] 3.7 Surface backend readiness conflict errors in the relevant product detail sections without losing unsaved operator input.

## 4. Full-Screen Product Customization Editor

- [x] 4.1 Add an admin route for editing product-owned customization from product detail.
- [x] 4.2 Reuse the embedded product customization editor adapter where practical while separating persistence from create-product state.
- [x] 4.3 Load ordered variant media as preview background choices in the editor and omit independent customization background upload.
- [x] 4.4 Initialize newly enabled customization from the default editor template with canvas dimensions derived from the first available variant image.
- [x] 4.5 Save layers and form fields through the product customization update route and return to or refresh product detail after save.
- [x] 4.6 Keep draft products editable with incomplete readiness while blocking published saves that break readiness.

## 5. Create-To-Detail Flow

- [x] 5.1 Change successful draft create navigation to `/products/:productId`.
- [x] 5.2 Change successful publish create navigation to `/products/:productId`.
- [x] 5.3 Remove create-flow dependence on local catalog insertion as the only way product detail can find the created product.

## 6. Verification And State

- [x] 6.1 Run `pnpm --filter backend test` for admin product route and customization readiness coverage.
- [x] 6.2 Run `pnpm --filter backend check` and `pnpm --filter backend build`.
- [x] 6.3 Run `pnpm --filter admin build`.
- [x] 6.4 Run `openspec validate admin-product-detail-customization-management --strict`.
- [x] 6.5 Run `./init.sh` before marking the change complete.
- [x] 6.6 Update this change's `progress.md` and `session-handoff.md` with implementation evidence and restart notes.
