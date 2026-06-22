# Cup Customization Production Design

**Date:** 2026-06-22  
**Status:** Approved  
**Scope:** Admin template authoring, storefront customization, and production-grade SVG/PDF export

## Goal

Allow an administrator to upload a cup image and define multiple customizable regions. A shopper can add single-line text or upload an image in each region, preview the result, and submit a design that can be exported as production-quality SVG and PDF with physical manufacturing measurements.

## Decisions

- A product may have multiple independent customization zones.
- Zones are rectangular and may be rotated.
- Text is always one line. Its font size automatically decreases until the text fits, subject to a configured minimum size.
- Shoppers may move, zoom, rotate, and crop uploaded images inside a zone.
- SVG and PDF are the required production formats.
- The initial production layout is not fixed. An export profile will support either one output per zone or a workshop-specific combined layout.
- The React editor is a preview and authoring surface. The backend is the authority that validates designs and generates production files.

## Recommended Architecture

Use a React canvas/scene-graph editor backed by a renderer-independent JSON document. Both the editor and the production renderer consume the same geometry and fitting rules. The backend reconstructs the design from original assets, validates it, and generates vector-first SVG and PDF output.

Pure DOM/SVG authoring remains possible but would require substantially more custom interaction code. Rasterizing a browser canvas into SVG/PDF is rejected because it loses vector text and is unsuitable for high-quality engraving.

```text
Admin template editor
  -> cup preview + physical zone definitions + production rules

Storefront React editor
  -> text/image layers + transforms + asset references
  -> renderer-independent design JSON

Production service
  -> authoritative validation
  -> original image assets + production fonts
  -> SVG + PDF + manufacturing metadata
```

## Coordinate Systems

Each zone has two coordinate representations:

- Preview placement: normalized coordinates relative to the cup preview image. This controls where the zone appears in the editor.
- Production space: width, height, bleed, and safe margins expressed in millimetres. Layer transforms are stored relative to this physical space.

No persisted design geometry depends on browser pixels or viewport size. Conversion between preview pixels and production millimetres happens only at render time.

## Template Model

```ts
type CustomZone = {
  id: string
  name: string
  previewBounds: {
    xRatio: number
    yRatio: number
    widthRatio: number
    heightRatio: number
    rotationDeg: number
  }
  widthMm: number
  heightMm: number
  bleedMm: number
  safeMarginMm: number
  allowedContent: Array<"text" | "image">
  textRules: {
    fontIds: string[]
    minFontSizePt: number
    maxFontSizePt: number
    alignment: "left" | "center" | "right"
    singleLine: true
  }
  production: {
    method: "print" | "engrave"
    colorMode: "rgb" | "cmyk" | "grayscale" | "monochrome"
    minImageDpi: number
  }
}
```

Templates and designs must be versioned. An order references the exact template version used during customization so later admin edits cannot silently change a purchased design.

## Design Document Model

The shopper design stores one isolated layer collection per zone. Text layers store the entered content, selected production font identifier, alignment, color, and resolved font size. Image layers store an immutable original-asset reference plus translation, scale, rotation, and crop data.

The JSON does not store HTML, a canvas bitmap, preview URLs as production sources, or machine-specific absolute filesystem paths.

## Single-Line Text Fitting

Text fitting is based on measured glyph width, not character count:

1. Normalize the input and remove newline characters.
2. Measure it using the exact production font and available safe width.
3. Use binary search to find the largest font size between the configured minimum and maximum that fits.
4. Never apply horizontal distortion to force a fit.
5. If the text still exceeds the safe width at the minimum size, mark the zone invalid and block checkout.
6. Repeat the same validation in the production service; the browser result is not authoritative.

Production export must embed the approved font or convert glyphs to vector paths. Path conversion is preferred for engraving output when text editability is not required.

## Uploaded Images

The system retains the original upload as the production source and generates a smaller preview derivative for browser editing. The shopper can translate, scale, rotate, and crop the preview within the zone. Content outside the zone is clipped.

The production renderer applies the stored transform to the original image. It calculates effective DPI from the pixels actually used after crop and the physical printed size:

```text
effective DPI = used pixels / printed dimension in inches
```

The editor reports acceptable, warning, or blocking quality based on the zone's configured DPI threshold. A blocking DPI failure prevents checkout and is revalidated during export.

Upload validation includes MIME type, decoded file type, dimensions, size, and any production-specific color constraints. Preview derivatives must never replace originals in production files.

## React Surfaces

### Admin

- `CupTemplateEditor`: uploads and displays the cup preview.
- `ZoneEditor`: creates, moves, resizes, and rotates multiple zones.
- `ZoneProperties`: configures physical dimensions, safe area, bleed, DPI, allowed content, and production method.
- `FontPolicyEditor`: chooses approved production fonts and size limits.
- `ExportProfileEditor`: selects separate-zone output or a later workshop layout profile.

### Storefront

- `CustomizerCanvas`: renders the preview and active zone.
- `ZoneTabs`: switches between front, back, base, or other zones.
- `TextTool`: edits single-line text and shows automatic font fitting.
- `ImageTool`: uploads, moves, zooms, rotates, and crops an image.
- `QualityIndicator`: reports text-fit, DPI, safe-area, and asset errors.
- `PreviewSummary`: requires review of all configured zones before checkout.

Editor state should be held in a dedicated document model rather than distributed across component-local state. React components dispatch document operations such as adding a layer or changing a transform.

## Production Output

Every SVG/PDF export includes or is accompanied by:

- exact artboard/page dimensions in millimetres;
- safe-area and bleed definitions according to the active export profile;
- vector text or outlined glyph paths;
- original-resolution images clipped with the approved transforms;
- order, product, template-version, and zone identifiers;
- production method and color mode;
- effective image DPI and relevant validation results.

An `ExportProfile` abstraction controls whether each zone becomes a separate SVG and PDF page/file or whether multiple zones are arranged in a workshop-specific layout. The zone design model remains independent of this decision.

## Validation and Failure Handling

Checkout is blocked when:

- text does not fit at the minimum font size;
- a production font is missing or unavailable;
- effective image DPI is below the blocking threshold;
- a required layer violates safe-area policy;
- an uploaded asset is missing or invalid;
- the design references an unavailable or incompatible template version.

File generation should be idempotent for an immutable design revision. Failures retain the source JSON and assets so generation can be retried without asking the shopper to recreate the design.

## Verification Strategy

- Unit-test text measurement and binary-search fitting across representative fonts and strings.
- Unit-test pixel-to-mm transforms, rotation, crop geometry, and effective DPI calculation.
- Contract-test template and design JSON validation on both client and backend.
- Golden-test SVG/PDF output for known designs.
- Verify that the same design JSON produces equivalent geometry in browser preview, SVG, and PDF.
- Inspect exported artboard/page dimensions in millimetres.
- Confirm fonts are embedded or outlined and missing-font cases fail closed.
- Test multiple zones to ensure layers and manufacturing metadata cannot leak between zones.
- Test template version mismatches and deterministic export retries.

## Deferred Decisions

- Workshop-specific combined-page layout and naming conventions.
- Exact production font catalogue and licensing constraints.
- DPI thresholds, bleed, safe margins, and color profiles for each printing or engraving method.
- Storage provider and retention policy for original shopper uploads and generated files.
- Whether engraving output requires automatic monochrome conversion or operator-reviewed artwork.

These decisions are represented as configuration or profiles so they do not require redesigning the editor document model.
