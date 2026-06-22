## Context

The repository has an initial product catalog, a mock-first admin application, and a React Router storefront on Cloudflare Workers. It does not yet have customization entities, object-storage bindings, font assets, production rendering, or a shared geometry contract.

The approved product behavior is:

- one cup product can expose multiple independent customization zones;
- zones are rectangular and may be rotated on the preview image;
- text is restricted to one line and automatically shrinks to fit;
- shoppers can move, scale, rotate, and crop uploaded images;
- production output is SVG and PDF with exact physical measurements;
- the workshop layout is deferred, so export must support separate-zone and future combined profiles.

## Goals / Non-Goals

**Goals:**

- Keep preview rendering and production output geometrically consistent.
- Store all production geometry in physical or normalized units rather than screen pixels.
- Preserve original image assets and vector text quality.
- Make backend validation authoritative and deterministic.
- Support multiple zones and immutable template/design revisions from the first schema.
- Fit the existing Hono, Drizzle, D1, React Router, and Cloudflare architecture.

**Non-Goals:**

- Arbitrary polygon or curved-surface distortion zones.
- Multi-line text, horizontal text distortion, or automatic text wrapping.
- A fixed workshop imposition layout before manufacturing requirements are known.
- Browser-generated production files as the authoritative order artifact.
- Automatic conversion of all artwork to a machine-specific engraving format.
- Supporting arbitrary uploaded fonts; only approved production fonts are available.

## Decisions

### Use a renderer-independent document model

The persisted design is JSON containing template and zone revisions, layer properties, normalized transforms, physical zone measurements, and immutable asset identifiers. It does not contain serialized Konva nodes, HTML, browser object URLs, or a flattened canvas image.

React components dispatch document operations. `react-konva` and `konva` render the document for admin zone placement and shopper interaction, but the domain model remains independent of Konva.

### Separate preview placement from production space

Each zone stores normalized bounds relative to the cup preview image for visual placement. The same zone stores width, height, bleed, and safe margins in millimetres for production. Layer transforms are defined in zone-local coordinates and converted to pixels only while rendering a preview.

This prevents responsive layout or device pixel ratio from changing the purchased design.

### Version templates and designs

Editing a published template creates a new revision. A shopper design references the exact template revision used during authoring. Checkout freezes an immutable design revision, and production export consumes only that frozen revision.

This prevents later admin edits from changing an existing order.

### Measure and outline text with the production font

`opentype.js` parses approved font bytes, measures glyph advances with kerning, and produces vector paths. The fitting function removes line breaks and uses binary search to find the largest permitted font size that fits the zone safe width. The design is invalid if it still does not fit at the minimum size.

The same fitting function and font revision run in the browser and backend. Production SVG uses glyph paths. PDF either embeds the approved font through `@pdf-lib/fontkit` or draws the same paths through `pdf-lib`; outlined paths are preferred for engraving profiles.

### Keep original uploads as production sources

The browser uploads the original image to private R2 storage using a short-lived signed operation and receives an immutable asset identifier. A smaller preview derivative may be used in the editor. Stored layer data records translation, scale, rotation, and crop relative to its zone.

Effective DPI is calculated from the source pixels used after crop divided by the physical output size in inches. The browser reports quality immediately, while the backend repeats the calculation and blocks invalid checkout/export.

The first implementation supports production-safe PNG and JPEG inputs. Additional formats require an explicit decoding and color-management decision.

### Generate SVG directly and PDF with pure JavaScript

The backend creates SVG through a small, typed serializer using physical dimensions, `clipPath`, transformed images, and outlined text paths. It creates PDF with `pdf-lib` and `@pdf-lib/fontkit`, using page dimensions converted from millimetres to PDF points.

This avoids native canvas or image-processing dependencies that are difficult to run reliably in Cloudflare Workers. The renderer uses original PNG/JPEG bytes and vector clipping rather than rasterizing the complete design.

### Store metadata in D1 and binary assets in R2

Drizzle/D1 stores templates, revisions, zones, design revisions, layers, asset metadata, export jobs, validation results, and output references. R2 stores cup previews, original shopper uploads, preview derivatives, approved font files, and generated SVG/PDF artifacts.

The exact binding names, bucket environments, retention policy, and credentials must be approved before implementation because the repository does not currently define them.

### Support export profiles

An export profile controls page/file naming, separate-zone versus combined layout, inclusion of safe/bleed guides, text outlining, and color expectations. The initial profile emits one SVG per zone and one PDF with a page per zone unless the workshop supplies a different layout before implementation.

### Keep generation deterministic and retryable

An export request identifies an immutable design revision and export profile revision. Repeated requests for the same pair produce the same logical output and can reuse a completed artifact. A failed job retains its input references and validation report for retry.

## Data Flow

1. Admin uploads a cup preview, defines zones and production rules, and publishes a template revision attached to a product.
2. Storefront loads the published template and approved font metadata.
3. Shopper edits text and image layers by zone; original images are uploaded to R2 and preview assets are rendered in Konva.
4. Storefront saves a draft design JSON through the backend.
5. Checkout requests authoritative validation; valid input is frozen as an immutable design revision.
6. Production export loads the frozen revision, exact template revision, font bytes, and original images.
7. Backend writes SVG/PDF plus manufacturing metadata to R2 and records output references in D1.

## Validation and Error Handling

Checkout and export fail closed when text does not fit, an approved font revision is missing, effective DPI is below the configured threshold, an asset is unavailable or invalid, required safe-area rules fail, or a template/design revision is incompatible.

Browser validation exists for immediate feedback only. Every production-sensitive rule runs again in the backend. Errors use stable machine codes plus zone and layer identifiers so the admin/storefront can identify the exact problem.

## Verification

- Unit tests cover millimetre/point conversion, normalized transforms, crop geometry, DPI calculation, and binary-search text fitting.
- Contract tests cover template and design validation between admin, storefront, and backend.
- Golden tests compare SVG and PDF output for fixed design fixtures.
- Geometry fixtures verify equivalent placement in Konva preview, SVG, and PDF.
- Integration tests cover template revision changes, frozen order designs, asset failures, export retries, and multiple-zone isolation.
- Manual production checks inspect page/artboard dimensions, font outlining/embedding, clipping, safe areas, bleed, and output identifiers.

## Risks / Trade-offs

- Konva text metrics can differ from production font metrics. The editor must use the shared OpenType measurement result rather than treating canvas measurement as authoritative.
- `opentype.js` is suitable for the approved Latin/Vietnamese use case but is not a complete shaping solution for every writing system. Broader script support may require HarfBuzz.
- PDF clipping and vector-path output require lower-level renderer tests; relying only on visual browser checks would hide manufacturing errors.
- R2 bindings and production limits are not yet configured. Implementation cannot assume bucket names, retention, or secrets.
- CMYK and workshop-specific engraving conversion are not guaranteed by browser or generic PDF libraries. They remain export-profile and prepress decisions.
- Cross-app delivery is larger than the current active admin feature. Implementation should be scheduled as a dedicated feature rather than folded into unrelated admin page work.
