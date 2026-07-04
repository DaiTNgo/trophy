## Context

Admin product creation currently has a Medusa-thin mock-first flow with Details, Organize, and Variants tabs. Variant media upload exists in the admin UI and product asset API, but product creation still stores products in browser-local catalog state. Customization authoring exists as a separate template editor backed by `customization_templates` and `customization_template_revisions`, with its own draft/publish lifecycle and persisted background.

The agreed domain direction is product-owned customization. A Customizable Product owns one Embedded Product Customization. Variant images provide Background Choices for admin placement checks and the Selected Variant Background for storefront rendering. The customization config stores editor rules and canvas dimensions, not separate background assets.

The repository is in dev mode, so this change can remove deprecated template/revision paths in the active scope instead of preserving compatibility layers.

## Goals / Non-Goals

**Goals:**

- Replace standalone customization template/revision lifecycle in the create product path with one-to-one product customization.
- Persist product customization with product draft/publish lifecycle.
- Store canvas dimensions, layers, and form fields in product customization, while deriving backgrounds from ordered variant media.
- Add ordered variant media persistence so each variant has a stable first image.
- Add a backend full-create product endpoint that saves product, variants, variant media, and optional customization together.
- Gate publishing of customizable products on Customization Publish Readiness.
- Embed the full customization editor into admin create product without separate template save/publish/revision controls.
- Render storefront customization previews against the shopper-selected variant image.

**Non-Goals:**

- No separate customization template listing or template publish flow for product-owned customization.
- No long-term compatibility with old customization template/revision rows.
- No automatic resizing, cropping, or normalization of mismatched variant images.
- No shopper-facing background picker separate from variant selection.
- No product-level revision workflow for editing published customization without publishing product changes.
- No manufacturing export job changes unless needed to compile against the product-owned model.

## Decisions

### Product customization is one-to-one with product

Add a `product_customizations` model keyed by `product_id` with a uniqueness constraint. It stores enabled state, canvas width, canvas height, layers JSON, form fields JSON, and timestamps.

This keeps large editor data out of the product row while making ownership explicit. The rejected alternative was to keep `customization_templates` as the owner and link it from product creation; that would preserve the wrong lifecycle and keep draft/publish semantics in two places.

### Backgrounds are derived from variant media

Product customization does not persist `background` or background asset JSON. The admin editor receives ordered variant images as preview backgrounds, and storefront rendering uses the first media item on the selected variant as the preview background.

The rejected alternative was to copy a background asset into customization config. That would duplicate product media, create drift when variant media changes, and reintroduce a separate customization background choice for shoppers.

### Store canvas dimensions with customization

Persist `canvas_width_px` and `canvas_height_px` on product customization. These values are derived from the first available variant image when customization is saved. When publishing a customizable product, all variant images must match these dimensions.

The editor already stores layer geometry as ratios. Persisting canvas dimensions keeps validation and export deterministic without storing the background image itself.

### Variant media needs an ordered relationship

Add an ordered variant-media relationship from product variants to uploaded product assets. `position` defines stable image order, and the first image is the selected variant background.

The rejected alternative was to embed variant media as JSON in variants. That would make ordering, asset reuse, asset deletion, and product reads harder to validate.

### Full-create owns product creation consistency

Add a backend full-create endpoint that accepts product details, organization metadata, attributes, options, variants, variant media, and optional customization in one request. Draft mode permits incomplete customization; publish mode requires Customization Publish Readiness.

The rejected alternative was to call multiple existing endpoints from the admin flow. That would allow partial product creation when later media or customization steps fail.

### Admin embeds the full editor in create product

Reuse the full customization editor affordances inside the Customization tab, but run it in an embedded mode: no template save, no template publish, no template revision display, and no independent background upload. The editor Background panel becomes a variant-image preview switcher.

This avoids building a second editor while aligning persistence with the product flow.

### Storefront follows selected variant

Storefront product data includes product-owned customization config and ordered variant media. The customization preview uses the selected variant's first image as the background. Shopper customization form fields still come from form fields and layers, but no separate background picker is rendered.

This matches the product mental model: the shopper picks a variant, then customizes that selected product blank.

## Risks / Trade-offs

- **Replacing template lifecycle touches backend, admin, storefront, and shared contracts** → Implement as vertical slices and keep verification at package/app boundaries.
- **Draft products may have incomplete customization data** → Validate JSON shape on draft, but reserve media completeness and full editor validity for publish.
- **Variant media changes can invalidate canvas dimensions** → Re-run background size contract validation whenever publishing and when entering the embedded editor from create product.
- **Existing editor code assumes `template.background` exists** → Introduce an adapter or embedded editor model that supplies preview canvas dimensions and selected preview background without persisting background as customization data.
- **Local D1 data using old template rows becomes stale** → Dev-mode cleanup can drop or ignore old rows in this change; no compatibility migration is required unless explicitly requested later.

## Migration Plan

1. Add product-owned customization and variant-media schema.
2. Add shared product-owned customization validation helpers and type adapters.
3. Add backend full-create product persistence and publish readiness validation.
4. Update admin create product to call the backend full-create path and gate the Customization tab.
5. Embed the customization editor in create product with variant-image preview backgrounds.
6. Update storefront product loading and selected-variant customization preview.
7. Remove or isolate obsolete template/revision create-product dependencies.
8. Verify backend checks/build, customization package tests, admin build, storefront typecheck/build, and `./init.sh`.

Rollback is a code rollback during dev mode. Local D1 can be recreated from the updated schema.

## Open Questions

None for this proposal.
