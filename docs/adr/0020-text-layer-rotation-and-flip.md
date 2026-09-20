# Text Layer Rotation and Flip

Text Layers in the customization template editor support angular rotation (`rotationDeg`) and independent visual mirroring (`flipHorizontal` and `flipVertical`). While geometric rotation exists in the general `LayerGeometry` schema, rotation controls on the canvas editor and inspector are scoped specifically to Text Layers to meet typography alignment requirements. Independent horizontal and vertical flips are stored within `TextEditorLayer.text` (`flipHorizontal`, `flipVertical`) as admin-configured template properties rather than general layer geometry or shopper-facing options.

On the canvas editor, rotation pivots around the bounding box center (`centerXPx`, `centerYPx`) via a dedicated top-stem rotation handle with free-angle dragging and 15° Shift-snapping, complemented by exact degree input and ±90° step buttons in the Inspector. Flipping inverts the inner text rendering content via horizontal/vertical scaling (`scaleX(-1)` / `scaleY(-1)`) rather than inverting the outer layer container, ensuring selection rings, resize handles, and delete actions retain their canonical geometric directions without reversing mouse drag interactions. The transformation propagates consistently across Storefront preview rendering, raster export (SVG), and PDF export (affine transformation matrix).

## Considered Options

- Store flip properties in `LayerGeometry` for all layer types. Rejected because reverse engraving and back-surface trophy printing in current scope specifically target text content, and keeping flip within `TextEditorLayer.text` preserves tight domain boundaries without unneeded shape-layer complexity.
- Invert the entire layer container element on canvas. Rejected because mirroring the outer container swaps left and right resize handles and inverts drag mathematics, disorienting operators during editing.
- Expose flip toggles to shoppers in the storefront purchase flow. Rejected because back-surface engraving is a shop-side manufacturing technique defined by the template author, not a customer-facing customization preference.
