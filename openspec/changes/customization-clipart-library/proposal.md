## Why

The previous customization icon asset work solved reusable shopper artwork, but the domain language and admin IA are now wrong for the intended workflow. Admins need a Customization-owned clipart library where categories own curated media assets, not a Brand Assets icon tab with tags and fixed single-asset behavior.

## What Changes

- **BREAKING** Rename the reusable artwork domain from icon assets to clipart assets across admin UI, backend contracts, shared customization types, and order/cart vocabulary.
- **BREAKING** Move admin navigation to a Customization hierarchy:
  - `Customization > Templates`
  - `Customization > Clipart`
  - `Customization > Brand Assets`
- **BREAKING** Migrate admin routes directly to `/customization/templates`, `/customization/clipart`, and `/customization/brand-assets`; do not keep legacy admin redirects.
- Add explicit `Clipart Category` management under `Customization > Clipart`.
- Add `Clipart Asset` management under each clipart category, supporting SVG, PNG, and WebP media.
- Remove tag-based icon metadata and model each clipart asset as belonging to exactly one clipart category.
- Add batch clipart asset upload with a review step: thumbnail, read-only filename, editable display name, and all-or-nothing validation.
- Remove the `fixed_clipart` source policy and the fixed single-asset shopper-hidden use case.
- Require clipart category layers to choose one clipart category, a layer clipart allowlist, and a default clipart asset.
- Keep `upload_only`, `clipart_category_only`, and `upload_or_clipart_category` source policies; upload-or-clipart always defaults to clipart while still supporting `source_select` and `side_by_side` presentations.
- Ensure deactivated clipart categories/assets are unavailable for new shopper choices and make publish readiness fail when referenced by active templates, while existing order snapshots remain reproducible.
- Update order snapshots to store selected clipart asset identity, display name, category ID, source asset reference, URL, MIME type, dimensions, and rendered layer context, without storing filename or category display name.

## Capabilities

### New Capabilities

- `customization-clipart-library`: Admin-managed clipart categories/assets and clipart-choice behavior for shopper customization.

### Modified Capabilities

- None.

## Impact

- `apps/admin`: sidebar IA, routes, Customization templates route paths, Brand Assets placement, Clipart management UI, product customization layer inspector/preview wording and controls.
- `apps/backend`: D1 schema/table names, admin route surface, validation helpers, route tests, storefront-safe runtime serialization, order snapshot capture.
- `packages/customization`: shared types, source policy enum, runtime serialization, validation, design building, and tests.
- `apps/storefront`: product customization form controls, default clipart selection behavior, upload-or-clipart source switching, cart line display/merge behavior.
- Existing dev-mode icon asset schema/code should be replaced rather than compatibility-wrapped.
