## Why

Shopper customization already supports text entry, font/color policies, and uploaded image shapes, but it does not support a TrophySmack-style approved icon/clip-art picker where shoppers choose from artwork curated by admins. This matters now because Trophy's customization model needs reusable sport symbols, badges, frames, decorative emblems, and trophy marks without turning those assets into product variants or requiring every shopper to upload their own file.

## What Changes

- Add an admin-managed customization icon asset library under Brand Assets.
- Allow admins to upload reusable SVG/PNG/WebP icon assets with name, category, tags, preview metadata, and active state.
- Extend product customization authoring so eligible image/icon layers can use one of three source policies: upload only, icon library only, or upload or icon library.
- Let admins choose a product/layer-specific icon allowlist so shoppers only see relevant approved icons.
- Extend storefront customization so shoppers can select an allowed icon asset as an alternative to, or replacement for, image upload.
- Capture selected icon asset metadata in cart/order customization snapshots so later asset edits do not mutate existing orders.
- Ensure production preview/export renders selected icons through the same fixed geometry and shape clipping rules as image shape layers.

## Capabilities

### New Capabilities

- `customization-icon-assets`: Admin-managed reusable icon assets and product/layer icon choice behavior for shopper customization.

### Modified Capabilities

- None.

## Impact

- `apps/backend`: D1 schema for icon assets, admin route surface for icon CRUD/upload, storefront-safe route data for allowed icon choices, and contract tests for management and public runtime behavior.
- `packages/customization`: Shared customization model, validation, runtime design building, and render/export support for icon-choice values.
- `apps/admin`: Brand Assets Icons tab, product customization layer source-policy controls, and product/layer allowlist selection UI.
- `apps/storefront`: Shopper customization form support for icon choice fields, selected-icon preview, cart capture, and checkout readiness.
- Orders/cart: customization snapshots must preserve selected icon identity and source metadata.
- Storage: R2-backed icon asset upload and serving, preferring SVG for vector-safe production output while allowing raster icon formats where needed.
