## 1. Shared Customization Model

- [x] 1.1 Rename shared icon asset types, schemas, builders, and test fixtures to clipart category/asset terminology.
- [x] 1.2 Replace source policy support with `upload_only`, `clipart_category_only`, and `upload_or_clipart_category`, and remove `fixed_clipart`.
- [x] 1.3 Add validation requiring clipart category, allowlist, and default asset for clipart-backed layer policies.
- [x] 1.4 Add validation that allowlisted/default clipart assets are active, in the selected category, and consistent with the layer policy.
- [x] 1.5 Update shared package tests for policy validation, default clipart behavior, and rejected `fixed_clipart`.

## 2. Backend Data And Services

- [x] 2.1 Replace icon asset schema/service names with clipart category and clipart asset tables/models.
- [x] 2.2 Model clipart categories with name plus system fields only, with no slug or description.
- [x] 2.3 Model clipart assets with one category, source asset reference, editable name, readonly filename, media metadata, active state, and timestamps.
- [x] 2.4 Remove tag storage and tag-based icon asset logic.
- [x] 2.5 Implement service validation for category lifecycle, asset lifecycle, supported MIME types, and all-or-nothing batch upload.

## 3. Backend Routes And Tests

- [x] 3.1 Add typed admin Hono RPC routes for clipart category create/list/update/deactivate/reorder flows.
- [x] 3.2 Add typed admin Hono RPC routes for clipart asset list/update/deactivate and category-scoped batch upload flows.
- [x] 3.3 Update storefront-safe runtime serialization to expose only active allowlisted clipart media for each layer.
- [x] 3.4 Add route contract tests covering success shapes, validation errors, not found cases, auth/session/role checks, and inactive entity boundaries.
- [x] 3.5 Add service/helper tests for batch upload atomicity, category/asset validation, and publish readiness failures.

## 4. Admin Navigation And Routes

- [x] 4.1 Move admin Customization navigation to Templates, Clipart, and Brand Assets children.
- [x] 4.2 Move customization template routes to `/customization/templates`.
- [x] 4.3 Add `/customization/clipart` for category and media management.
- [x] 4.4 Move brand colors/fonts UI to `/customization/brand-assets`.
- [x] 4.5 Delete legacy icon/brand-assets routes and redirects that are no longer part of the current contract.

## 5. Admin Clipart Management UI

- [x] 5.1 Build clipart category create/list/rename/deactivate/reorder UI using existing admin Medusa-style components.
- [x] 5.2 Build category-scoped clipart media list with thumbnail, editable display name, readonly filename, active state, and media metadata.
- [x] 5.3 Build batch upload selection and review UI with thumbnail, filename, name input, per-row validation, and atomic commit.
- [x] 5.4 Ensure duplicate files in one batch are blocked and duplicate display names in a category remain allowed.

## 6. Admin Layer Configuration UI

- [x] 6.1 Update product customization layer inspector labels and state from icon assets to clipart media.
- [x] 6.2 Add fixed clipart category selection for `clipart_category_only` and `upload_or_clipart_category` policies.
- [x] 6.3 Add layer allowlist selection from the selected clipart category.
- [x] 6.4 Add required default clipart asset selection from the allowlist.
- [x] 6.5 Keep `source_select` and `side_by_side` presentation controls for `upload_or_clipart_category` without a default source control.

## 7. Storefront Runtime

- [x] 7.1 Update storefront customization form types and rendering from icon asset to clipart media terminology.
- [x] 7.2 Render only active allowlisted clipart media for the admin-selected category and never expose a shopper category picker.
- [x] 7.3 Default `upload_or_clipart_category` layers to clipart with the configured default media selected.
- [x] 7.4 Support switching between upload and clipart while submitting only the currently selected source/value.
- [x] 7.5 Use clipart asset names for shopper hover tooltips, accessible labels, and selected media labels.

## 8. Cart, Orders, And Export

- [x] 8.1 Update cart line customization values and merge behavior to use clipart source/value identity.
- [x] 8.2 Update order snapshot capture to store clipart asset ID, display name, category ID, source asset ID, URL/source reference, MIME type, dimensions, and rendered context.
- [x] 8.3 Ensure order snapshots do not store original filename or category display name.
- [x] 8.4 Update order/admin display and export/rendering paths to use clipart media snapshots for historical reproducibility.

## 9. Verification And State

- [x] 9.1 Run `pnpm --filter customization test`.
- [x] 9.2 Run `pnpm --filter backend test`, `pnpm --filter backend check`, and `pnpm --filter backend build`.
- [x] 9.3 Run `pnpm --filter admin build`.
- [x] 9.4 Run `pnpm --filter router-cf typecheck` and `pnpm --filter router-cf build`.
- [x] 9.5 Run `./init.sh` and record evidence in the active OpenSpec progress/session files.
