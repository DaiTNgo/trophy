## Why

Trophy products need production-ready personalization rather than a preview-only overlay. Administrators must define where artwork can appear on each cup, shoppers must be able to compose text and images safely inside those regions, and operators must receive SVG and PDF files with physical measurements suitable for printing or engraving.

The existing catalog deliberately deferred customization to a separate module. This change introduces that module without coupling customization geometry to product variants or browser canvas pixels.

## What Changes

- Add versioned product customization templates with a cup preview and multiple rectangular, rotatable zones.
- Let administrators configure normalized preview placement, physical dimensions in millimetres, safe margins, bleed, fonts, minimum DPI, allowed content, and production method per zone.
- Add a React-based shopper editor for single-line text and uploaded images.
- Automatically reduce text size to the largest permitted value that fits on one line; block checkout when text cannot fit at the configured minimum.
- Let shoppers move, zoom, rotate, and crop original uploaded images while reporting effective production DPI.
- Persist renderer-independent design JSON and immutable asset references rather than HTML or canvas bitmaps.
- Add authoritative backend validation and deterministic production export to SVG and PDF.
- Add export profiles so zones can be delivered separately now or arranged in a workshop-specific combined layout later.

## Capabilities

### New Capabilities

- `customization-template-authoring`: Admin creation, versioning, and product assignment of cup previews, production zones, and zone-specific rules.
- `shopper-product-customization`: Storefront authoring and validation of text and image layers across multiple zones.
- `production-artwork-export`: Authoritative validation and production-quality SVG/PDF generation with physical manufacturing metadata.

### Modified Capabilities

None. Product customization remains a separate module attached to existing products.

## Impact

- `apps/admin`: new customization-template authoring workflow using React, `react-konva`, and `konva`.
- `apps/storefront`: shopper customization editor using the same renderer-independent geometry model.
- `apps/backend`: Hono contracts, Valibot validators, Drizzle schema and migrations, font measurement, asset upload coordination, and production export.
- Cloudflare: new R2 bindings and upload policy for original assets, preview derivatives, approved fonts, and generated files.
- New runtime dependencies are expected to include `konva`, `react-konva`, `opentype.js`, `pdf-lib`, `@pdf-lib/fontkit`, and `aws4fetch`.
- The change adds cross-app API and persistence contracts; implementation must begin with the shared domain schema and backend routes before UI integration.
