## Why

Admin repeats "convert PDF to preview, measure native dimensions, compare with the expected size" independently in four places, and the copies have drifted: some throw when dimensions cannot be read, others fall back to `0`/`{0, 0}`/`undefined` and can send `0x0` Declared Background Dimensions to the backend. That breaks the Background Size Contract and the publish-readiness check on matching dimensions.

## What Changes

- Add one shared admin helper module, `apps/admin/src/lib/media-asset.ts`, owning PDF preview conversion, native dimension reading, and dimension comparison.
- Route Product media flows through it: Create Product (gallery + Customization Media), Product Detail variant create, Product Detail customization setup (`stageFile`), and Variant Media Management (background replace + gallery upload).
- **BREAKING (behavioral)**: a Customization Background whose dimensions cannot be read is rejected at upload in every status, with an operator-visible error. Unknown dimensions (`0`, `{0, 0}`, `undefined`) are never staged or sent to the backend.
- Remove the per-call-site `.catch(() => null)` / `?? 0` fallbacks.
- Add unit tests for `media-asset.ts`.
- Record the rejection rule in `CONTEXT.md` (Background Size Contract) — done.
- Out of scope: Collection and Category image uploads (`create-collection-modal`, `collections/detail`, `create-category-modal`, `categories/detail-feature`); they only need `toPreviewImageFile` and are a separate small task.

## Capabilities

### New Capabilities
- `admin-media-asset-reading`: how admin reads an uploaded Product media file — PDF preview image, native dimensions of the original file, comparison against an expected size, and rejection when dimensions are unreadable.

### Modified Capabilities

(none — no existing specs under `openspec/specs/`)

## Impact

- Code: `apps/admin/src/lib/media-asset.ts` (new, plus tests), `use-create-product.ts`, `use-product-detail-variants.ts`, `product-detail-customization.tsx`, `variant-media-manager.tsx`.
- No backend, API, schema, or dependency changes.
- Docs: `CONTEXT.md` Background Size Contract.
