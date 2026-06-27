## 1. Shared Package Types & Utilities

- [ ] 1.1 Add `VectorPointType`, `VectorPoint`, `VectorPath` types and `"vector"` to `ShapeType` in `packages/customization/src/types.ts`
- [ ] 1.2 Add `vectorPointsToSvgPathD()` function to `packages/customization/src/geometry.ts` that converts `VectorPoint[]` to SVG path `d` string (handles M, L, C commands and Z close)
- [ ] 1.3 Export new types and functions from `packages/customization/src/index.ts`

## 2. Admin Editor — Vector Drawing Mode

- [ ] 2.1 Add "Draw shape" button to Blocks panel in `customization-template-panels.tsx` that toggles draw mode
- [ ] 2.2 Add draw mode state to `useTemplateEditor.ts` (isDrawing, pendingPoints, drawPointType)
- [ ] 2.3 Build `VectorDrawOverlay` component: floating panel with Undo, Close Shape, Cancel buttons, renders on top of canvas in draw mode
- [ ] 2.4 Implement click-to-add-corner-point on canvas (pointer event → xRatio/yRatio relative to background)
- [ ] 2.5 Implement click-drag-to-add-smooth-point on canvas (pointer down + move → point with handles in drag direction)
- [ ] 2.6 Implement draw mode preview rendering (draw connecting lines/curves between pending points on canvas)
- [ ] 2.7 Implement close path logic: detect click on first point or Close Shape button → create image shape layer with `type: "vector"` and `vectorPath`

## 3. Admin Editor — Vector Point Editing

- [ ] 3.1 Render draggable point circles on selected vector layers in `CanvasLayer`
- [ ] 3.2 Implement point drag: pointer events on point circles → update `VectorPoint.xRatio/yRatio`
- [ ] 3.3 Show Bézier handles (blue dots + dashed lines) on single-clicked smooth point
- [ ] 3.4 Implement handle drag: drag handle dot → update `inHandle`/`outHandle` with mirrored adjustment
- [ ] 3.5 Implement double-click to toggle `corner` ↔ `smooth` on a point
- [ ] 3.6 Implement Delete/Backspace to remove selected point with path reconnection
- [ ] 3.7 Add "Vector Points" table to inspector in `customization-template-inspector.tsx` with numeric inputs and type selector

## 4. Rendering — Vector Shapes

- [ ] 4.1 Update `cssShapeClip()` in admin `customization-template-ui.tsx` to call `vectorPointsToSvgPathD()` for `"vector"` shapes
- [ ] 4.2 Update `cssShapeClip()` in storefront `CupCustomizer.tsx` to handle `"vector"` shapes
- [ ] 4.3 Update `shapeClipSvg()` in `apps/backend/src/routes/customizations/render.ts` to handle `"vector"` for SVG export
- [ ] 4.4 Verify `PreviewImageShapeLayer` in admin Preview dialog renders vector-clipped uploads correctly
- [ ] 4.5 Run `pnpm --filter customization test`, `pnpm --filter admin build`, `pnpm --filter backend check`

## 5. Cleanup

- [ ] 5.1 Remove the old `custom-shapes-library` design doc (replaced by vector editor)
- [ ] 5.2 Remove `customization_shapes` table and shapes API routes (no longer needed)
- [ ] 5.3 Remove `ShapeLibraryDialog`, `PolygonDrawTool`, `useShapeLibrary` hook
- [ ] 5.4 Remove `getCustomSvgClipPath()`, `validateSvgPathData()`, `scaleSvgPath()` — replaced by `vectorPointsToSvgPathD()`
- [ ] 5.5 Clean up `CustomShape` type and `custom_svg` ShapeType from shared types
- [ ] 5.6 Update session-handoff.md and feature_list.json
