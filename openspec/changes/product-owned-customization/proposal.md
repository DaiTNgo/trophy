## Why

Customization is currently modeled as a standalone template lifecycle, but the desired workflow treats customization as part of product creation and product publishing. Product variants provide the background images that storefront shoppers see, so customization rules need to be saved with the product and validated against variant media instead of being published as a separate template.

## What Changes

- **BREAKING**: Replace the create-product path's dependency on standalone `customization_templates` and `customization_template_revisions` with product-owned customization.
- Add a one-to-one product customization model that stores enabled state, canvas dimensions, layers, and form fields.
- Add ordered variant media relationships so the first image for each variant is stable and can act as the selected variant background.
- Add a backend full-create product endpoint that persists product details, organization, options, variants, variant media, and optional customization config in one product creation flow.
- Add product-level customization publish readiness validation: every created variant must have at least one image, all variant images must share one pixel size, and the customization editor model must be valid.
- Update admin create product so Details owns the customization switch and Customization appears after Variants only when enabled.
- Embed the full customization editor inside create product while removing separate template save, publish, and revision controls.
- Change the editor Background panel in create product into a variant-image preview selector for admins, not a persisted background upload.
- Update storefront product customization preview so the background follows the shopper-selected variant image and no separate background picker appears.

## Capabilities

### New Capabilities

- `product-owned-customization`: Product-owned customization persistence, full-create product integration, variant-derived backgrounds, admin create-product authoring, publish readiness, and storefront selected-variant preview.

### Modified Capabilities

None.

## Impact

- `apps/backend`: product schema, product asset/media relationships, full-create product API, product read API, validation, and removal/replacement of standalone template lifecycle paths for this flow.
- `apps/admin`: create product modal workflow, variant media validation, product-owned editor embedding, and create submission behavior.
- `apps/storefront`: product loading, variant selection state, and customization preview rendering.
- `packages/customization`: shared product-owned editor model validation and runtime helpers that no longer rely on template status or revision state.
- Local D1 schema may change without compatibility migrations because the repository is in dev mode.
