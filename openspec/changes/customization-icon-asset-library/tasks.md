## 1. Backend Icon Asset Foundation

- [x] 1.1 Add D1 schema for admin-managed customization icon assets, including source asset ID, preview URL, metadata, active state, and timestamps.
- [x] 1.2 Add backend helpers for validating icon metadata and accepted MIME types, preferring SVG while allowing PNG/WebP.
- [x] 1.3 Add admin route-surface tests for icon list, upload/create, metadata update, deactivate, auth rejection, and validation failure cases.
- [x] 1.4 Implement admin Hono RPC route handlers for icon asset management with explicit typed JSON success/error responses.
- [x] 1.5 Add shopper-safe route-surface tests proving storefront product/runtime data exposes only published layer allowlist icons.

## 2. Shared Customization Model

- [x] 2.1 Extend `@trophy/customization` types with icon asset summaries, fixed clipart category data, image/icon layer source policy (`fixed_clipart`, `upload_only`, `clipart_category_only`, `upload_or_clipart_category`), upload/clipart presentation mode, layer icon allowlist, selected source mode, and selected icon field values.
- [x] 2.2 Update customization validation so fixed-clipart layers require exactly one active icon and clipart-category layers require a fixed category with active allowed icons before publish.
- [x] 2.3 Update customization value validation so submitted icon values must belong to the published layer allowlist.
- [x] 2.4 Update design-building/render helpers so selected icons render through the same geometry and clipping contract as image shape layers.
- [x] 2.5 Add runtime serialization helpers that emit explicit source-policy data for fixed-clipart, upload-only, clipart-picker-only, and upload-or-clipart-picker layers.
- [x] 2.6 Add package tests for fixed-clipart, upload-only, clipart-category-only, upload-or-clipart-category, source-select presentation, side-by-side presentation, fixed category filtering, invalid icon value, required missing icon value, runtime serialization, and snapshot-friendly selected icon values.

## 3. Admin Brand Assets UI

- [x] 3.1 Extend the Brand Assets admin client to fetch, create/upload, update metadata, and deactivate icon assets through the admin route surface.
- [x] 3.2 Add an Icons tab to Brand Assets with thumbnail, name, category, tags, file type, active state, and upload/edit/deactivate actions.
- [x] 3.3 Ensure icon uploads capture preview/source metadata and show validation errors for unsupported files.
- [x] 3.4 Keep existing Colors and Fonts behavior unchanged.

## 4. Admin Product Customization Authoring

- [x] 4.1 Add source policy controls to eligible image/icon layers: fixed clipart, upload only, clipart category only, and upload or clipart category.
- [x] 4.2 Add layer controls that let admins choose the fixed icon for fixed-clipart layers or choose one fixed category plus allowed active icons for clipart-category-enabled layers.
- [x] 4.3 Add presentation controls for upload-or-clipart-category layers: source select or side by side.
- [x] 4.4 Block publish when fixed-clipart layers have no fixed icon or clipart-category layers have no fixed category with active allowed icons.
- [x] 4.5 Update admin Preview mode so fixed-clipart layers render without input, source-select layers show Upload image / Clipart selection, and side-by-side layers show the fixed category clipart list next to upload image.
- [x] 4.6 Add focused admin tests or helper tests for source policy submission, presentation mode, and publish-readiness behavior.

## 5. Storefront Runtime And Cart

- [x] 5.1 Extend storefront product loader data to include explicit image/icon source-policy runtime data for each published layer, including only shopper-safe fixed icon, upload config, categories, and allowed icon summaries as appropriate.
- [x] 5.2 Render source controls in the shopper customization form: fixed-clipart shows no input, upload-only shows media upload, clipart-category-only shows the fixed category icon list, upload-or-clipart-category with source-select shows Clipart / Upload image selection, and upload-or-clipart-category with side-by-side shows the fixed category icon list next to upload image.
- [x] 5.3 Render selected icons in the storefront preview using fixed geometry and clipping, without shopper geometry controls.
- [x] 5.4 Validate checkout readiness for required icon layers and invalid icon selections.
- [x] 5.5 Update cart line merge logic so different selected icons produce distinct customized cart lines.

## 6. Orders And Production Export

- [x] 6.1 Extend order customization snapshots to capture selected icon asset ID, name, file type, source metadata, and rendered layer context.
- [x] 6.2 Ensure existing order snapshots remain stable if an admin later renames, deactivates, or changes the Brand Assets icon record.
- [x] 6.3 Update production export to embed SVG icons as vector where supported and raster icons from original source assets.
- [x] 6.4 Add backend/order tests for icon snapshot capture and post-edit order stability.

## 7. Verification And State

- [x] 7.1 Run `pnpm --filter @trophy/customization test` and `pnpm --filter @trophy/customization check`.
- [x] 7.2 Run `pnpm --filter backend test`, `pnpm --filter backend check`, and `pnpm --filter backend build`.
- [x] 7.3 Run `pnpm --filter admin build`.
- [x] 7.4 Run `pnpm --filter router-cf typecheck` and `pnpm --filter router-cf build`.
- [x] 7.5 Run `openspec validate customization-icon-asset-library --strict`.
- [x] 7.6 Run `./init.sh`.
- [x] 7.7 Update this change's `progress.md` and `session-handoff.md` with implementation evidence, blockers, and next steps.
