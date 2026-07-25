## Context

The current product-owned customization model stores one product customization record but derives its background choices from ordered rows in `product_variant_media`. Admin create and detail flows upload and edit only that gallery collection, while the editor and storefront treat the first gallery image as the canvas. The requested model needs a second, variant-owned asset relationship without changing the product-level template/layer model.

This is a cross-cutting, breaking change across D1 schema, admin routes and clients, upload lifecycle, readiness validation, the embedded/detail editor adapters, and storefront product reads. The repository is in development mode, so no compatibility migration or gallery-derived fallback is required for existing data.

## Goals / Non-Goals

**Goals:**

- Persist one nullable Customization Media relationship per variant, independent from ordered Gallery Media.
- Support staged upload during Create Product and upload/replace during Product Detail.
- Enforce one shared pixel dimension across all Customization Media for an enabled customizable product.
- Keep draft saves possible while preventing the customization editor and publish from using incomplete readiness.
- Feed only Customization Media to admin editor background choices and storefront selected-variant customization preview.
- Use Customization Media as storefront image fallback only when a variant has no Gallery Media.
- Delete superseded or variant-deleted Customization Media assets after the replacement/deletion succeeds.

**Non-Goals:**

- No shared Customization Media asset across variants.
- No Customization Media gallery, history, remove action, crop, resize, or automatic normalization.
- No shopper-facing background picker.
- No migration or fallback that derives a canvas from existing Gallery Media.
- No change to product-level customization layers, form fields, or template lifecycle.

## Decisions

### Store the customization relationship separately from gallery media

Add a one-to-one variant-to-asset relationship (for example, `product_variant_customization_media`) with the variant as the stable owner and the asset ID as the independently uploaded file. Keep `product_variant_media` unchanged for ordered Gallery Media. A separate relationship makes the “one canvas versus many references” contract explicit and prevents gallery reorder/delete operations from changing the canvas.

The rejected alternative is adding a boolean marker to `product_variant_media`: it would make the canvas necessarily be a gallery item, contradict the requirement that the two uploads are unrelated and would complicate replacement and asset cleanup.

### Extend full-create and section-specific variant contracts

The create payload carries an optional `customizationMedia.assetId` per variant in addition to `media[]`. The admin frontend uploads/stages the independent asset before full-create and submits its ID. Product detail uses dedicated variant customization-media upload/replace operations and includes the relationship in the admin product read model; gallery media endpoints remain separate.

The rejected alternative is reusing the existing variant media update payload: doing so would allow a gallery update to accidentally replace the canvas and would make API intent ambiguous.

### Validate readiness against customization media only

When customization is enabled, publish readiness requires one Customization Media for every variant and identical width/height across those assets. Gallery media count and dimensions do not participate. Draft saves may omit the asset and report readiness issues; opening the editor requires all required assets. Published product variant creation/replacement is rejected if it would leave the product unready, and persisted data remains unchanged on conflict.

The first available Customization Media establishes the expected dimensions for an incomplete draft. Replacing an existing asset must match the dimensions already established by the other variant assets; no crop or resize is performed.

### Keep admin actions visibly separate

Each variant row/editor shows independent `Gallery media (n)` and `Upload customization media` / `Replace customization media` actions. A Customization Media thumbnail is shown beside the replace action. There is no remove action; replacement is the only mutation after first upload. The Customization action is hidden when product customization is disabled.

### Read and render the two media roles independently

Admin customization background choices are the variant Customization Media records labeled by variant. Storefront selected-variant customization rendering uses that record. Storefront gallery/list imagery uses Gallery Media; only when that collection is empty may the Customization Media URL be used as a non-managed display fallback.

## Risks / Trade-offs

- **Two upload lifecycles can leave unreferenced assets after a failed save** → Persist the relationship before deleting a superseded asset; add cleanup/error handling and route tests for replacement failure.
- **Existing products have only gallery-derived backgrounds** → Treat them as not customization-ready in dev mode; do not infer or silently migrate a canvas.
- **Published variant changes can break a live customization flow** → Validate the prospective full product state before mutating and return a conflict naming the missing or mismatched Customization Media.
- **Create currently stages one media collection and derives canvas size from its first item** → Add a separate staged customization asset state and remove all helper logic that reads gallery media for canvas selection.
- **Storefront clients may assume the first gallery item is the preview** → Add explicit read-model fields and contract tests so selected-variant customization and gallery fallback are distinguishable.

## Migration Plan

1. Add the variant customization-media relationship and explicit API/read-model fields.
2. Add upload/replacement and cleanup behavior with backend contract tests.
3. Update full-create and detail variant contracts plus admin staging and actions.
4. Update readiness, editor background choices, storefront rendering, and fallback behavior.
5. Remove gallery-derived canvas helpers and update/replace archived assumptions in active code paths.
6. Run backend tests/check/build, admin build, storefront typecheck/build, OpenSpec validation, and `./init.sh`.

Rollback in development is a code rollback. No data migration or compatibility layer is planned.

## Open Questions

None from the product design session. The exact table/endpoint names may follow existing repository naming conventions during implementation.
