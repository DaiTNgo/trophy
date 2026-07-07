## Context

Trophy already has a product-owned customization direction: physical product choices remain variants, while personalization data is stored as customization values and captured into cart/order snapshots. The admin customization editor supports text layers, image shape upload layers, dynamic brand colors, and dynamic font families, but it has no reusable icon/clip-art library for shoppers to choose from.

TrophySmack's reference flows show shoppers choosing clip art or uploading their own logos for custom awards. Trophy needs the same domain split: admin-approved reusable icons are brand/customization assets, while shopper-uploaded files remain order-specific uploads. Icons must not become variants, because choosing an icon does not change SKU, price, inventory, or product media.

## Goals / Non-Goals

**Goals:**

- Add an admin-managed reusable icon asset library to Brand Assets.
- Store icon source files and metadata in backend-owned tables/R2 assets.
- Let product customization layers opt into fixed-clipart, upload-only, clipart-picker-only, or upload-or-clipart behavior.
- Require product/layer-specific icon allowlists so shoppers see only relevant approved icons.
- Render selected icons through existing fixed layer geometry and shape clipping.
- Preserve selected icon metadata in cart/order customization snapshots.
- Keep SVG vector output where possible for production export.

**Non-Goals:**

- No free public icon search or third-party icon marketplace integration.
- No shopper upload into the global icon library.
- No shopper control over icon layer position, size, rotation, shape, or z-index.
- No automatic image tracing or background removal for uploaded icons.
- No migration of existing image upload layers unless they are explicitly edited to use icon library behavior.

## Decisions

### Global Icon Library Plus Product/Layer Allowlists

Icons are managed globally under Brand Assets, but each product customization layer stores its own icon allowlist.

This keeps admin reuse high while preserving product relevance. A football trophy layer can expose football icons, while a corporate plaque can expose badges or frames. Showing the entire global library to every shopper would be noisy and would leak irrelevant artwork into products.

Alternative considered: store icons only inside each product customization. That avoids allowlists but creates duplication and makes updates painful when the same icon is reused across products.

### Extend Image Shape Semantics Instead Of Creating Variants

Icon selection is a customization value for an image/icon-capable layer. It does not create a variant or option value.

Variants continue to represent physical SKU axes such as size, color, finish, and material. Icons are order-item personalization data and should be snapshotted with the selected design.

Alternative considered: model icon choices as product options. That would pollute SKU selection, produce variant growth, and make product browsing treat artwork choices as inventory choices.

### Source Policy And Shopper Source Selector On Each Eligible Layer

Each image/icon-capable layer has a source policy:

- `fixed_clipart`
- `upload_only`
- `clipart_category_only`
- `upload_or_clipart_category`

This source policy is part of the published customization runtime contract consumed by storefront. Storefront must not infer behavior from the presence or absence of assets alone; it renders controls from the explicit source policy plus the layer's fixed geometry, required flag, fixed icon, allowed icons, and category metadata.

The existing upload behavior remains available: shoppers can upload an image and pan/scale it inside the fixed shape without changing the shape's geometry. Clipart category behavior shows icons from an admin-fixed category for that layer. Fixed clipart behavior lets the admin place one specific clipart asset into the shape without asking the shopper to choose anything.

For `upload_or_clipart_category`, the admin also chooses a storefront presentation:

- `source_select`: storefront shows a selector with `Clipart` and `Upload image`; the selected source controls which action appears.
- `side_by_side`: storefront shows the fixed clipart category list and upload image action beside each other.

For `source_select`, the shopper UI exposes two choices:

- `Upload image`: show the existing media upload form and crop/pan/scale controls.
- `Clipart`: show the fixed category's clipart list.

This supports the TrophySmack pattern where shoppers may either pick approved clip art or upload their own logo while keeping one fixed product shape.

For `fixed_clipart`, the admin selects exactly one icon asset on the layer. The shopper sees the fixed asset in the preview but does not see an input control for that layer unless the layer also has some other shopper-facing setting in a later scope. Fixed clipart is useful for decorative badges, frames, stars, or product marks that belong to the design but are still managed through the reusable icon asset library.

### Storefront Runtime Contract

Published product customization data should expose image/icon layers with an explicit runtime shape similar to:

```ts
type ImageIconSourcePolicy =
  | "fixed_clipart"
  | "upload_only"
  | "clipart_category_only"
  | "upload_or_clipart_category";

type UploadClipartPresentation = "source_select" | "side_by_side";

type RuntimeImageIconLayer = {
  id: string;
  fieldId?: string;
  required: boolean;
  geometry: LayerGeometry;
  shape: ShapeConfig;
  sourcePolicy: ImageIconSourcePolicy;
  presentation?: UploadClipartPresentation;
  fixedIcon?: RuntimeIconAsset;
  fixedCategory?: { id: string; label: string };
  allowedIcons: RuntimeIconAsset[];
  upload: {
    enabled: boolean;
    fit: "cover" | "contain";
    panEnabled: boolean;
    zoomEnabled: boolean;
  };
};
```

Runtime rules:

- `fixed_clipart`: `fixedIcon` is required; `allowedIcons` and upload controls are not shopper-facing.
- `upload_only`: upload is enabled; `fixedIcon`, clipart categories, and icon choices are not shopper-facing.
- `clipart_category_only`: `fixedCategory` and `allowedIcons` are required; upload is not shopper-facing.
- `upload_or_clipart_category`: upload, `fixedCategory`, and `allowedIcons` are available; storefront uses `presentation` to decide between source selector and side-by-side rendering.
- The runtime contract includes only shopper-safe icon metadata and URLs.

### Fixed Clipart Category Is Shopper Navigation, Not A Product Variant

Icon categories belong to the admin-managed asset library and help shoppers browse a layer's allowed icons. They do not create product variants, pricing axes, or inventory dimensions.

For this scope, each clipart-enabled shape uses one admin-fixed category. Storefront renders the list of active allowed icons from that category. If no active icons remain in the fixed category, the product customization is not publish-ready.

### Snapshot Selected Icon Metadata

The selected icon value stores the icon asset identity and the metadata needed to reproduce the order later. Order snapshots should include at least icon asset ID, name, mime type, source dimensions when available, and the rendered layer result.

The order must not depend on live Brand Assets records staying unchanged. If an admin renames, archives, or replaces an icon later, previous orders still need to render and export the purchased design.

### SVG Preferred, Raster Allowed

The icon library should prefer SVG for sharp previews and vector-capable production export. PNG/WebP are allowed for practical asset imports, but production export must preserve original resolution and flag raster behavior through metadata.

SVG upload must be sanitized or served safely by backend-controlled asset routes. Storefront must receive only shopper-safe URLs and metadata.

## Risks / Trade-offs

- **Untrusted SVG content** → Sanitize SVG uploads and serve with safe content headers; reject scripts/external references.
- **Global icon list becomes noisy** → Use categories/tags for admin search, but expose only product/layer allowlists to shoppers.
- **Order drift after icon edits** → Snapshot selected icon metadata and immutable asset references at cart/order capture.
- **Production export inconsistencies between SVG and raster icons** → Keep SVG vector where possible, preserve raster source pixels, and cover both in shared render/export tests.
- **Model overlap with existing image upload layer** → Treat upload and icon choice as source policies on the same image/icon layer family instead of creating unrelated renderers.

## Migration Plan

1. Add icon asset schema and route surfaces without changing existing product customization documents.
2. Extend the shared customization model to allow icon source policies and icon field values.
3. Add Brand Assets icon management.
4. Add product/layer allowlist configuration.
5. Add storefront icon choice rendering and snapshot capture.
6. Keep existing upload-only layers as upload-only by default.

Rollback is straightforward while no product uses icon-library layers: disable the UI entry points and leave existing upload-only customization behavior unchanged.

## Open Questions

- Should SVG be the only allowed production-ready icon format, with PNG/WebP treated as preview-only or lower-confidence production assets?
- Should inactive icons remain selectable in already-published product customizations until the admin removes them from the layer allowlist, or should inactive status hide them from all future shopper sessions immediately?
