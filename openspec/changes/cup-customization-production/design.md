## Context

The repository has an initial product catalog, a mock-first admin application, and a React Router storefront on Cloudflare Workers. It does not yet have a finalized production customization model in the persisted runtime artifacts. Earlier drafts used a `zone -> block` hierarchy. The approved v1 implementation replaces that with a block-only model to keep the current codebase simpler and remove abstractions that are not used.

The approved product behavior is:

- one cup product can expose multiple independent customization blocks;
- renderable blocks are rectangular and have administrator-defined position and size on the preview image;
- administrators define ordered v1 personalization blocks directly on the template;
- v1 personalization blocks are limited to `text_single`, `text_multi`, `image_upload`, and `icon_picker`;
- non-rendering control fields such as radio/select/color/checkbox can drive defaults, visibility, acknowledgements, and confirmation;
- `perpetual_list` is intentionally deferred from v1 because it requires repeater rows, per-cell validation, and plate layout/export behavior;
- shoppers edit form values and may only pan/zoom uploaded media inside fixed administrator-defined image bounds;
- administrators edit only business-facing block settings in v1; technical export fields stay hidden from the admin form;
- administrators can switch the template editor between `Edit` and `Preview` modes to test shopper behavior against the current draft without publishing it;
- logo and badge blocks can expose revisioned preset assets or optional uploads;
- production output is SVG and PDF with exact physical measurements;
- the workshop layout is deferred, so export must support separate-block and future combined profiles.

## Goals / Non-Goals

**Goals:**

- Keep preview rendering and production output geometrically consistent.
- Store all production geometry in physical or normalized units rather than screen pixels.
- Preserve original image assets and vector text quality.
- Make backend validation authoritative and deterministic.
- Support multiple blocks and immutable template/design revisions from the first schema.
- Fit the existing Hono, Drizzle, D1, React Router, and Cloudflare architecture.

**Non-Goals:**

- Arbitrary polygon or curved-surface distortion regions.
- Shopper-controlled freeform layout, horizontal text distortion, or automatic unbounded wrapping.
- A fixed workshop imposition layout before manufacturing requirements are known.
- Browser-generated production files as the authoritative order artifact.
- Automatic conversion of all artwork to a machine-specific engraving format.
- Supporting arbitrary uploaded fonts; only approved production fonts are available.
- TrophySmack-style perpetual/champion list authoring in v1.

## Decisions

### Use a renderer-independent document model

The persisted design is JSON containing template revisions, block definitions, layer properties, physical block measurements, and immutable asset identifiers. It does not contain serialized Konva nodes, HTML, browser object URLs, or a flattened canvas image.

React components dispatch document operations. `react-konva` and `konva` render the document for admin block placement and shopper preview, but the domain model remains independent of Konva.

Shopper interaction is form-driven for block values. Only administrators place and size blocks. The storefront updates typed block values and renders the result using fixed template geometry. For uploaded media, the shopper may pan and zoom the uploaded image inside the clipped block bounds; those adjustments do not alter the block position or size.

### Define v1 personalization as typed blocks

The template owns ordered, stable block definitions. The v1 block taxonomy is deliberately small:

- `text_single`: a single-line input for short prominent text such as award title, event name, recipient name, year, or company name. It may enforce `maxChars`, optional uppercase normalization, fixed or shopper-selectable color, fixed or shopper-selectable font family, and fixed bounds.
- `text_multi`: a bounded textarea for short honor messages or descriptions. It may enforce `maxChars`, `maxLines`, fixed or shopper-selectable color, fixed or shopper-selectable font family, and fixed bounds.
- `image_upload`: an administrator-placed artwork/logo upload slot. It may enforce accepted MIME types, file-size limit, fixed fit policy, monochrome preview treatment, production treatment, and artwork-rights acknowledgement.
- `icon_picker`: an administrator-managed grid of preset icons or badges. Options reference immutable preview and production asset revisions, may be grouped by category, may expose a default option, and may allow `none`.

Renderable blocks include fixed normalized placement and production style rules. Non-rendering acknowledgements such as artwork-rights and final design confirmation are validation controls rather than first-class v1 renderable block types.

### Keep the admin editor minimal in v1

The administrator should not configure low-level production geometry through form inputs. V1 authoring focuses on:

- block type
- label, help text, required state
- text limits and defaults
- visibility conditions
- fixed versus shopper-selectable style choices for text color and font family
- icon/background option lists
- upload constraints relevant to the shopper flow

Placement is adjusted visually by changing the block's position and size on the preview. The admin form does not expose manual inputs for `x`, `y`, `width`, `height`, DPI, bleed, safe margin, minimum/maximum font size, or other technical export fields in v1.

### Add an admin preview mode for draft testing

The admin template editor should support two explicit modes on the same page:

- `Edit mode`: author block schema and placement
- `Preview mode`: simulate the shopper form and preview using the current unsaved or unpublished draft

`Preview mode` reuses the same schema-driven rendering rules as the storefront. It does not create or publish a shopper design. Instead it uses a separate sandbox of preview/test values so the administrator can type text, choose options, and upload test assets to validate behavior before leaving the admin page.

The editor must keep `templateDraft` separate from `previewValues`:

- `templateDraft` is the authoring source of truth and is the only state that can be saved or published
- `previewValues` are temporary shopper-like inputs used only inside `Preview mode`

Switching from `Edit mode` to `Preview mode` should rehydrate `previewValues` from the latest draft so the simulation always matches the current template configuration.

### Separate preview placement from production space

Each renderable block stores normalized bounds relative to the cup preview image for visual placement. The same block stores width, height, bleed, and safe margins in millimetres for production.

This prevents responsive layout or device pixel ratio from changing the purchased design.

Those values remain part of the internal production contract, but they are not intended to be direct v1 admin-form inputs.

### Use a one-level coordinate model for responsive previews

The cup preview asset is the top-level visual reference. The system stores its intrinsic pixel size when the administrator uploads it. Every renderable block preview rectangle is normalized directly against that intrinsic preview image, not against the current canvas size or browser viewport.

Administrator interactions still happen in pixels because position and size handles operate on the currently displayed canvas. The editor converts pixel geometry back into normalized ratios immediately after each interaction and persists only those ratios. When the same template is reopened on another screen size, the editor recalculates pixels from the stored ratios and the current displayed image dimensions.

This rule applies equally to the storefront preview. Responsive layouts may shrink or enlarge the cup image, but every renderable block rectangle must be recomputed from the same shared normalized data so it remains visually locked to the underlying product image.

### Version templates and designs

Editing a published template creates a new revision. A shopper design references the exact template revision used during authoring. Checkout freezes an immutable design revision, and production export consumes only that frozen revision.

### Keep original uploads as production sources

The browser uploads the original image to private R2 storage and receives an immutable asset identifier. A smaller preview derivative may be used in the editor. Uploaded media renders with a cover baseline clipped to the block bounds. Shopper/admin Preview pan and zoom controls store renderer-independent crop metadata next to the uploaded asset value, while the original image remains the production source. Effective DPI is calculated from the source pixels used and the physical output size in inches. The browser reports quality immediately, while the backend repeats the calculation and blocks invalid checkout/export.

The first implementation supports production-safe PNG and JPEG inputs.

### Generate SVG directly and PDF with pure JavaScript

The backend creates SVG through a typed serializer using physical dimensions, clipping, transformed images, and text output. It creates PDF with `pdf-lib`, using page dimensions converted from millimetres to PDF points.

### Store metadata in D1 and binary assets in R2

Drizzle/D1 stores templates, revisions, design revisions, validation results, and output references. R2 stores cup previews, original shopper uploads, preview derivatives, approved font files, and generated SVG/PDF artifacts.

### Support export profiles

An export profile controls page/file naming, separate-block versus combined layout, inclusion of safe/bleed guides, text outlining, and color expectations. The initial profile emits one SVG per block and one PDF with a page per block unless the workshop supplies a different layout before implementation.

### Keep generation deterministic and retryable

An export request identifies an immutable design revision and export profile revision. Repeated requests for the same pair produce the same logical output and can reuse a completed artifact.

## Data Flow

1. Admin uploads a cup preview, defines blocks and production rules, and publishes a template revision attached to a product.
2. Admin may switch to `Preview mode`, which builds temporary preview values from the current draft and simulates the shopper form/preview locally.
3. Storefront loads the published template.
4. Shopper completes the admin-defined form; fixed `text_single`, `text_multi`, `image_upload`, and `icon_picker` blocks render selected defaults, text, and uploaded assets in the preview. Uploaded media may be panned and zoomed only inside the fixed block bounds.
5. Storefront saves a draft design JSON through the backend.
6. Checkout requests authoritative validation; valid input is frozen as an immutable design revision.
7. Production export loads the frozen revision, exact template revision, and original images.
8. Backend writes SVG/PDF plus manufacturing metadata to R2 and records output references in D1.

## Validation and Error Handling

Checkout and export fail closed when text does not fit, effective DPI is below the configured threshold, an asset is unavailable or invalid, required safe-area rules fail, or a template/design revision is incompatible.

Browser validation exists for immediate feedback only. Every production-sensitive rule runs again in the backend. Errors use stable machine codes plus block and layer identifiers so the admin/storefront can identify the exact problem.

## Verification

- Unit tests cover millimetre/point conversion, normalized transforms, DPI calculation, text fitting, and block visibility.
- Contract tests cover template and design validation between admin, storefront, and backend.
- Golden tests compare SVG and PDF output for fixed design fixtures.
- Geometry fixtures verify equivalent placement in Konva preview, SVG, and PDF.

## Risks / Trade-offs

- Konva text metrics can differ from production font metrics. The editor must use shared fitting rules rather than treating canvas measurement as authoritative.
- PDF clipping and vector-path output require lower-level renderer tests; relying only on visual browser checks would hide manufacturing errors.
- R2 bindings and production limits are not yet fully configured for every environment.
