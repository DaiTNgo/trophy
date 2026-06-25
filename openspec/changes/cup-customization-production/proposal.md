## Why

Trophy products need production-ready personalization rather than a preview-only overlay. Administrators must define fixed personalization areas on each cup, shoppers must fill those areas through a form without manipulating artwork directly, and operators must receive SVG and PDF files with physical measurements suitable for printing or engraving.

The existing catalog deliberately deferred customization to a separate module. This change introduces that module without coupling customization geometry to product variants or browser canvas pixels.

## What Changes

- Add versioned product customization templates with a cup preview and multiple typed personalization blocks.
- Let administrators configure normalized preview placement, physical dimensions in millimetres, safe margins, bleed, fonts, minimum DPI, fit policy, and production method per renderable block.
- Add a React-based shopper editor for schema-driven single-line text, bounded multi-line text, preset icon selection, and uploaded artwork.
- Automatically reduce single-line text size to the largest permitted value that fits on one line; block checkout when text cannot fit at the configured minimum.
- Keep shopper image placement fixed by the admin while reporting effective production DPI.
- Persist renderer-independent design JSON and immutable asset references rather than HTML or canvas bitmaps.
- Add authoritative backend validation and deterministic production export to SVG and PDF.
- Add export profiles so blocks can be delivered separately now or arranged in a workshop-specific combined layout later.

## Capabilities

### New Capabilities

- `customization-template-authoring`: Admin creation, versioning, and product assignment of cup previews, typed personalization blocks, and block-specific rules.
- `shopper-product-customization`: Storefront authoring and validation of schema-driven text and image layers across multiple blocks.
- `production-artwork-export`: Authoritative validation and production-quality SVG/PDF generation with physical manufacturing metadata.

### Modified Capabilities

None. Product customization remains a separate module attached to existing products.

## Impact

- `apps/admin`: customization-template authoring workflow using React, `react-konva`, and `konva`.
- `apps/storefront`: shopper customization editor using the same renderer-independent geometry model.
- `apps/backend`: Hono contracts, validation, Drizzle schema and migrations, asset upload coordination, and production export.
- Cloudflare: R2 bindings and upload policy for original assets, preview derivatives, approved fonts, and generated files.
- New runtime dependencies include `konva`, `react-konva`, `pdf-lib`, and shared customization utilities.
