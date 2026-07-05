## Why

Admin product detail currently edits product options and variants through broad full-replace flows that do not match Medusa's product-management behavior and can overwrite unrelated variant state. Variants and pricing need a Medusa-like management experience while preserving Trophy's own product model, especially variant media used for customization backgrounds.

## What Changes

- Replace the product detail variants/pricing edit experience with Medusa-like section actions: manage options, manage variants, edit prices, edit stock, and manage variant media.
- Base all displayed and editable fields on Trophy's current product model, not Medusa's richer model.
- Add operation-specific admin backend route contracts so admin edit actions update only the fields they own.
- Explicitly prohibit the new admin product detail edit UI from using full-replace options or variants APIs for routine edit actions.
- Preserve variant media as Trophy domain data instead of copying Medusa's product-media-first association model.

## Capabilities

### New Capabilities

- `admin-product-variant-management`: Admin product detail can manage Trophy product options, variants, prices, stock, and variant media through Medusa-like section and bulk-edit interactions without full-replacing unrelated state.

### Modified Capabilities

- None.

## Impact

- Admin app: product detail variants/pricing UI under `apps/admin/src/pages/product-detail/`.
- Backend app: admin product route surface under `apps/backend/src/routes/admin/products.ts` and related contract tests.
- Shared admin client code: product client methods under `apps/admin/src/lib/products-client.ts`.
- Domain docs: product option, variant, and variant management action language in `CONTEXT.md`.
- Verification: backend API contract tests, backend check/build/test, admin build, and `./init.sh`.
