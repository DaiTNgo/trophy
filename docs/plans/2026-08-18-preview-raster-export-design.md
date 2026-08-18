# Preview Raster Export Design

## Decision

Add client-side image export for the admin customization preview. It renders a
fresh SVG from the `CustomizationTemplate` and `CustomizationDesign` data,
rasterizes that SVG into a detached canvas, and downloads the resulting Blob.
It does not capture the zoomed or panned Preview dialog DOM.

## Output

- WebP is the default download when the browser encoder returns `image/webp`.
- PNG is always selectable and is the automatic fallback when WebP is not
  available. It preserves alpha and is the reliable output for sharp artwork.
- JPEG is intentionally out of scope because the preview can contain
  transparency and text/flat graphics benefit from PNG or WebP.
- PDF export remains available during this change for workflows that explicitly
  need PDF; image export is the preferred proof/preview action.
- The Admin Order Detail customization modal uses the same export path against
  the frozen template and values snapshot, so downloaded proofs match the
  purchased order rather than the current product draft.

## Rendering

The export utility uses the intrinsic background dimensions multiplied by an
explicit scale (default 2), independent of the editor viewport. It serializes
background, ordered text layers, image crop/rotation and SVG clip paths from
the same shared geometry helpers used by the Preview. It waits for all assets
and fonts before encoding, and fails with a visible error if an asset cannot be
used in an origin-clean canvas.

## Verification

Unit tests cover output format negotiation and SVG serialization for cropped,
rotated image layers and vector paths. The admin build validates the component
integration.
