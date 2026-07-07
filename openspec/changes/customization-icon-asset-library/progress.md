# Progress

## Current State

- OpenSpec change `customization-icon-asset-library` is implemented and verified.
- Shopper-safe runtime coverage is in place:
  - `apps/backend/src/routes/storefront/products.test.ts` now proves fixed-clipart runtime only exposes an active fixed icon and strips inactive allowlist records.
  - Existing clipart allowlist sanitization coverage remains in place for upload-or-clipart layers.
- Admin publish-readiness coverage is now in place:
  - `apps/admin/src/hooks/product-customization-publish.ts` centralizes the publish-readiness check used by `useProductCustomizationEditor`.
  - `apps/admin/src/hooks/useProductCustomizationEditor.test.ts` now proves fixed-clipart and clipart-category publish failures surface the shared validation messages.
- Order snapshot stability evidence is now in place:
  - `apps/backend/src/lib/order-utils.test.ts` proves order summaries use the stored icon name from the snapshot instead of depending on later Brand Assets edits.
  - `apps/backend/src/routes/storefront/orders.test.ts` now proves order creation stores selected icon metadata in `customizationSnapshotJson`.
- Production export behavior improved in `apps/admin/src/lib/pdf-export.ts`:
  - PDF export now accepts SVG and WebP sources instead of silently dropping them.
  - Supported SVG icons are drawn as vector PDF paths inside the same fixed clip geometry.
  - Unsupported SVG structures still fall back to raster embedding, preserving “vector where supported” behavior.
  - Raster icon sources continue to embed from the original asset source path rather than a degraded preview derivative.
- Shared package coverage now includes the remaining source-policy matrix:
  - `packages/customization/src/index.test.ts` now covers upload-only runtime serialization, inactive fixed-category filtering, upload-only submitted values, and snapshot-friendly selected icon metadata on rendered layers.

## Evidence

- Research source: `docs/research/2026-07-07-trophysmack-customization-use-cases.md`.
- Related design source: `docs/plans/2026-06-28-brand-assets-design.md`.
- Domain terms added in `CONTEXT.md`: `Customization Icon Asset`, `Icon Choice Field`.
- Verification completed in this session:
  - `rtk pnpm --filter customization test`
  - `rtk pnpm --filter backend test`
  - `rtk pnpm --filter backend check`
  - `rtk pnpm --filter backend build`
  - `rtk pnpm --filter admin test`
  - `rtk pnpm --filter admin build`
  - `rtk openspec validate customization-icon-asset-library --strict`
  - `rtk ./init.sh`

## Blockers / Risks

- SVG safety is still based on strict rejection of scripts, event handlers, external refs, and `foreignObject`; that is acceptable for the current route contract, but deeper sanitization may still be warranted later.
