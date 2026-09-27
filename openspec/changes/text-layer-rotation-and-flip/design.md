## Context

Customizable products such as crystal trophies, acrylic plaques, and corporate awards frequently require angled inscriptions and reverse/mirror engraving. For transparent crystal trophies, the back surface is engraved with horizontally mirrored text so that when viewed from the front, the inscription appears correct and protected beneath the glass.

In the current Trophy codebase:
- `LayerGeometry` defines `rotationDeg: number`, but `customization-template-editor.tsx` and `customization-template-inspector-sections.tsx` lack interactive rotation handles and degree inputs.
- No schema or UI exists for horizontal or vertical mirroring of text.
- Export pipelines (`raster-export.ts` and `pdf-export.ts`) already understand `rotationDeg` but lack flip transformations.

## Goals / Non-Goals

**Goals:**
- Enable operators to rotate Text Layers interactively on the canvas editor and numerically via the Inspector panel.
- Enable operators to flip Text Layers horizontally (`flipHorizontal`) and vertically (`flipVertical`) via toggle buttons in the Inspector panel.
- Ensure the canvas bounding box, resize handles, and delete actions retain canonical orientations during flipping by transforming inner text content (`scaleX(-1)` / `scaleY(-1)`).
- Render rotated and flipped text consistently across Admin canvas editing, Storefront runtime preview, raster SVG export, and vector PDF export.

**Non-Goals:**
- Exposing rotation or flip controls to shoppers on the storefront (mirroring and rotation are template design decisions made by the operator).
- Exposing rotation or flip handles to Image Shape Layers in the canvas editor or inspector UI in this change (scoped specifically to Text Layers as confirmed in domain modeling).
- Rotating individual letters independently or 3D text transformations.

## Decisions

### Decision 1: Store `flipHorizontal` and `flipVertical` on `TextEditorLayer.text`
- **Choice**: Add `flipHorizontal?: boolean` and `flipVertical?: boolean` to `TextEditorLayer.text` and `RuntimeTextLayer`.
- **Rationale**: Reverse engraving is a typography/text requirement for award production. Scoping flip to `layer.text` avoids introducing unnecessary complexity or ambiguous clipping behavior to Image Shape Layers.
- **Alternatives Considered**: Storing `flipHorizontal` in `LayerGeometry`. Rejected because the current production requirement is specifically text-focused.

### Decision 2: Transform inner text content rather than the layer container for flip
- **Choice**: Apply CSS/SVG `scale(${flipH ? -1 : 1}, ${flipV ? -1 : 1})` to the text content container, while keeping the layer container and resize handles un-mirrored.
- **Rationale**: If the entire layer container is mirrored with CSS `scaleX(-1)`, the right resize handle appears on the left, causing mouse dragging to move in the opposite direction of the pointer. Transforming the inner content ensures standard handle behavior and clean mouse interactions.

### Decision 3: Canvas rotation handle with Shift-key snapping
- **Choice**: Add a circular rotation handle positioned above the center of the selected Text Layer (connected via a subtle stem line). Dragging calculates the angle between pointer position and the bounding box center `(centerXPx, centerYPx)`. Holding `Shift` snaps to 15° increments.
- **Rationale**: Provides fast visual rotation for template designers, matching standard graphics software conventions (Figma, Canva).

### Decision 4: Complement canvas rotation with Inspector numeric input and step buttons
- **Choice**: In `PositionFields` (or dedicated Text Transform section in `TextInspector`), add a degree input (`0° - 359°`) and `+90°` / `-90°` quick-turn buttons.
- **Rationale**: Allows precise alignment for vertical or diagonal inscriptions without relying solely on manual pointer dragging.

### Decision 5: Affine transformation matrix in PDF export
- **Choice**: In `pdf-export.ts`, combine `rotationDeg`, `flipHorizontal`, and `flipVertical` into the transformation matrix around `(frameCx, frameCy)`.
- **Rationale**: `pdf-lib` supports native `concatTransformationMatrix`, enabling true vector rendering for straight text even when rotated and flipped, with SVG rasterization for path text.

## Risks / Trade-offs

- **[Risk] Path text rendering distortion when flipped**: SVG `<textPath>` elements can behave unexpectedly if scaled negatively without adjusting `dominant-baseline` or center transform origin.
  → *Mitigation*: Wrap the `<svg>` or `<g>` containing the text path with a centered transform matrix `scale(fx, fy)` relative to the layer bounds, ensuring the entire path geometry and text flip together predictably.
- **[Risk] Backward compatibility with existing templates**: Saved templates lack `flipHorizontal` and `flipVertical`.
  → *Mitigation*: Both properties are optional booleans defaulting to `false` when absent. Existing saved templates render identical to current behavior.
