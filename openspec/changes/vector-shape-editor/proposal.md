## Why

Currently admin operators can only use 6 built-in shapes (rectangle, circle, ellipse, rounded_rectangle, star, heart) for image shape layers. Trophy designs often require unique clip-path shapes that match specific cup geometries — a shared shape library doesn't make sense because shapes are per-template and tied to the background image context.

## What Changes

- Add a new `"vector"` ShapeType that lets operators draw custom clip-path shapes directly on the editor canvas
- Support vector points with both `corner` (straight edge) and `smooth` (Bézier curve) modes, matching Figma's vector network
- Points are fully editable after creation: drag to reposition, adjust handles, toggle corner/smooth, delete points
- Vector path data is stored as part of the layer inside `blocksJson` (no new database tables or API routes)
- Built-in 6 shapes remain unchanged as quick presets — vector is an additional mode
- Canvas Draw mode for creating shapes, plus point editing UI on the canvas and in the inspector
- SVG/PDF export handles `vector` shapes by converting points to SVG path data

## Capabilities

### New Capabilities
- `vector-shape-drawing`: Draw vector shapes on the editor canvas with corner and smooth points, close path, and convert to image shape layer
- `vector-shape-editing`: Post-creation point editing — drag points/handles, toggle corner/smooth, delete points, via canvas interaction and inspector panel
- `vector-shape-rendering`: Render vector shapes as CSS clip-path `path()`, SVG `<clipPath>`, and PDF-compatible path data

### Modified Capabilities
- (none — no existing specs change)

## Impact

- `packages/customization/src/types.ts` — add `VectorPoint`, `VectorPointType`, `VectorPath` types and `"vector"` ShapeType
- `packages/customization/src/geometry.ts` — add `vectorPointsToSvgPathD()` converter
- `apps/admin/src/components/customization/customization-template-editor.tsx` — add draw mode overlay and point editing within `CanvasLayer`
- `apps/admin/src/components/customization/customization-template-inspector.tsx` — add vector point table in inspector
- `apps/admin/src/components/customization/customization-template-panels.tsx` — add "Draw shape" button in Blocks panel
- `apps/admin/src/hooks/useTemplateEditor.ts` — add vector drawing state
- `apps/backend/src/routes/customizations/render.ts` — handle `"vector"` in `shapeClipSvg()` for SVG/PDF export
