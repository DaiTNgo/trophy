# Preview Canvas Raster Export Research

Date: 2026-08-18

## Decision

Add a raster export path from the customization `template` + `design` data and make **PNG** the required production-safe format. Offer **WebP** as the default download when the browser actually returns `image/webp`, with a transparent fallback to PNG. Offer **JPEG** only for explicitly opaque output because JPEG has no alpha channel.

Do not try to export the currently visible preview element by calling `toBlob()` on it: it is not a canvas. The current preview is composed of HTML, `<img>`, `<svg>`, `<clipPath>`, and text elements. It needs a dedicated renderer that produces an export canvas (or an SVG intermediate rasterized into a canvas), then calls `canvas.toBlob(...)`.

## Repository Findings

- `apps/admin/src/components/customization/customization-template-preview.tsx` exposes only `Export PDF` and calls `exportVectorPdfClientSide(...)`.
- The preview rendered by `@trophy/customization-react` is DOM/SVG, not an `HTMLCanvasElement`. For vector image-shape layers it uses an inline SVG `<clipPath>` and `<image>` in `packages/customization-react/src/preview-layers.tsx`.
- `apps/admin/src/lib/pdf-export.ts` does implement PDF clipping for built-in and vector shapes, so the claim that all vector shapes inherently fail is too broad. However, its vector-clip implementation does **not** mirror the preview path serializer in `packages/customization/src/geometry.ts`:
  - it does not apply `cornerRadius`;
  - when a closed path joins the last point to the first, it only uses `closePath()`, so it cannot preserve that final segment's Bezier handles;
  - it does not apply the per-image `cropRotationDeg` that the preview applies.
  These differences can make a PDF export differ from the on-screen vector shape.
- The PDF exporter fetches remote background/layer assets in the browser. A raster exporter has the same cross-origin concern if it draws those assets to a canvas.
- PDF upload preview already rasterizes a PDF page to WebP via `canvas.toDataURL("image/webp", 0.9)` in `apps/admin/src/components/customization/customization-template-ui.tsx`. That is a useful local precedent, but `toBlob()` is preferable for a file download because it avoids constructing a base64 data URL.

## Recommended Implementation

### Output Contract

1. Add `exportRasterPreviewClientSide(template, design, options)` under `apps/admin/src/lib/`.
2. Render at `background.widthPx * scale` by `background.heightPx * scale`, with `scale` defaulting to `2`. The visible editor zoom must not affect exported dimensions.
3. Download a `Blob` with the returned `blob.type`, rather than assuming the requested MIME type. Use a matching extension.
4. Expose an `Export image` control. The conservative initial options are:
   - `PNG` (always available, preserves transparency, production baseline)
   - `WebP` (quality `0.92`, lower size; accept it only when `blob.type === "image/webp"`)
   - `JPEG` (quality `0.92`, only after compositing an opaque white background)

### Renderer Shape

Use a pure renderer driven by `CustomizationDesign`, not a screenshot library or the mutable editor DOM. This keeps export deterministic and makes it testable separately from the UI.

Two feasible variants are:

1. **SVG intermediate, recommended for visual parity.** Build an SVG with the design's native width/height, `<image>` elements for assets, SVG `<clipPath>` paths produced by the existing `vectorPointsToSvgPathD(...)`, and SVG text/path-text. Resolve every asset to same-origin/blob/data URLs, load the SVG as an image, draw it to an offscreen canvas at the requested scale, then encode the canvas.
2. **Direct Canvas 2D renderer.** Draw background/images/text with `CanvasRenderingContext2D`; derive vector clip paths from the same geometry. This avoids SVG image loading but requires implementing path text, Bezier paths, rounded corners, and font positioning again. It is the better long-term choice only if the product needs a reusable rendering engine beyond the existing SVG-friendly feature set.

For the current codebase, start with the SVG intermediate because vector clips and preview image layers already use SVG. Before enabling it for production artwork, add golden-image tests for built-in shapes, a closed vector with Bezier handles, rounded vector corners, rotated crops, straight/path text, and a PDF background thumbnail.

## Browser APIs and Format Behavior

`HTMLCanvasElement.toBlob(callback, type, quality)` asynchronously produces a file `Blob`. `toDataURL(type, quality)` produces a base64 data URL, which is less suitable for the final download. The HTML Standard sets PNG as the default, and specifies a fallback to PNG if the requested format is unsupported. The `quality` argument applies only to variable-quality formats; the exact encoder interpretation is implementation-defined.

- [HTML Standard: `toDataURL()` / `toBlob()`](https://html.spec.whatwg.org/multipage/canvas.html#serializing-bitmaps-to-a-file)
- [HTML Standard: image serialization algorithm and quality](https://html.spec.whatwg.org/multipage/canvas.html#a-serialization-of-the-bitmap-as-a-file)

The standard does not mandate WebP specifically. Requesting `image/webp` is reasonable, but code must check `blob.type`; unsupported types fall back to `image/png`. This makes PNG the only format the application should promise universally.

`OffscreenCanvas.convertToBlob({ type, quality })` is the Promise-based equivalent and can be useful for an isolated renderer or a worker. It is not required for the first implementation: a detached normal canvas plus a Promise wrapper around `toBlob()` is simpler and has no worker/font-loading complication. It has the same origin-clean restriction.

- [HTML Standard: `OffscreenCanvas.convertToBlob()`](https://html.spec.whatwg.org/multipage/canvas.html#dom-offscreencanvas-converttoblob-dev)

## Cross-Origin and Asset Requirements

Canvas bitmaps start origin-clean. Drawing a non-origin-clean image marks the destination canvas non-origin-clean. Once that happens, `toDataURL()` and `toBlob()` throw `SecurityError`; `OffscreenCanvas.convertToBlob()` rejects with the same error. Therefore all raster-exportable assets must be one of:

- same-origin;
- a local `File` / blob URL / data URL created from user-provided bytes; or
- fetched with CORS permission and converted to an application-created blob URL before drawing.

The asset server must return an appropriate `Access-Control-Allow-Origin` response for the admin origin. For an `<img>` source fetched directly, set `crossOrigin = "anonymous"` **before** assigning `src`; for an explicit `fetch`, use a CORS request and fail visibly if it is rejected. Do not use `no-cors`: it yields an opaque response whose bytes cannot be read into a blob.

- [HTML Standard: canvas security and origin-clean propagation](https://html.spec.whatwg.org/multipage/canvas.html#security-with-canvas-elements)
- [HTML Standard: CORS settings attributes](https://html.spec.whatwg.org/multipage/urls-and-fetching.html#cors-settings-attributes)
- [Fetch Standard: CORS protocol and responses](https://fetch.spec.whatwg.org/#http-cors-protocol)

## Constraints and Operational Notes

- Raster output has a fixed pixel size. It is not suitable as a replacement for true vector/print-artwork output when physical print specifications require arbitrary scaling or CMYK color management.
- A `2x` scale is a useful screen-quality default. Print-oriented exports need an explicit target derived from the physical design dimensions and target DPI; do not infer print quality from the editor's CSS size.
- WebP and JPEG are lossy at normal quality settings. Use PNG for crisp text, flat artwork, and transparency; use WebP for a compact proof/preview; use JPEG only when transparent pixels are intentionally flattened.
- Wait for `document.fonts.ready` and asset decode/load completion before rendering, otherwise the exported text can use a fallback font or images can be missing.

## Conclusion

Yes, image export is a practical alternative and is likely the safer near-term output for the current vector-shape parity problem. It should be added as a separate raster export route, not by replacing the editor preview or by pretending the current DOM is a canvas. Keep PDF export only where a genuine vector/print workflow is required; otherwise make WebP (with PNG fallback) the operator-facing default.
