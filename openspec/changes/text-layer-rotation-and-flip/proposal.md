## Why

Customizable awards, crystal trophies, and plaques often require angled typography and reverse/mirror engraving (in/khắc mặt sau phôi pha lê trong suốt để nhìn xuôi từ mặt trước). Currently, although `rotationDeg` exists in `LayerGeometry`, the customization canvas editor and inspector lack rotation handles and inputs, and the data model lacks horizontal and vertical flip controls for text. Providing explicit text rotation and mirroring enables operators to design and produce reverse-engraved awards and rotated text layouts accurately.

## What Changes

- Add `flipHorizontal?: boolean` and `flipVertical?: boolean` to `TextEditorLayer.text` and `RuntimeTextLayer`.
- Add an interactive on-canvas rotation handle above selected Text Layers in `EditorCanvas` with free-angle dragging and 15° Shift-key snapping.
- Add rotation degree input (`0° - 359°`) and ±90° quick rotate buttons to the Inspector panel for Text Layers.
- Add horizontal (`↔`) and vertical (`↕`) flip toggle buttons to the Inspector panel for Text Layers.
- Apply inner-content mirroring transforms (`scaleX(-1)`, `scaleY(-1)`) so selection rings, resize handles, and delete actions preserve canonical mouse drag orientations.
- Propagate text rotation and flip transformations consistently across Storefront runtime preview (`@trophy/customization-react`), raster SVG export, and PDF vector/raster export.

## Capabilities

### New Capabilities
- `text-layer-rotation-and-flip`: Covers data modeling, canvas rotation handle interaction, inspector controls, and multi-surface rendering (canvas, storefront preview, raster export, PDF export) for Text Layer rotation and horizontal/vertical flipping.

### Modified Capabilities

None.

## Impact

- `@trophy/customization`: Schema updates to `TextEditorLayer` and `RuntimeTextLayer` in `types.ts`, and runtime layer mapping in `design.ts`.
- `@trophy/customization-react`: Preview text rendering in `preview-layers.tsx` to apply rotation and flip transformations.
- `apps/admin`: Canvas editor (`customization-template-editor.tsx`, `customization-template-editor-text.tsx`), Inspector panel (`customization-template-inspector-sections.tsx`), and production export utilities (`raster-export.ts`, `pdf-export.ts`).
- Backend/D1: No migration needed as template layers are serialized within template JSON payloads.
