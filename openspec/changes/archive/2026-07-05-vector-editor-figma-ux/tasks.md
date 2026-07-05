## 1. Type and SVG Path Updates

- [x] 1.1 Update `VectorPoint` in `packages/customization/src/types.ts` to include optional `cornerRadius?: number`.
- [x] 1.2 Update `vectorPointsToSvgPathD` in `packages/customization/src/geometry.ts` to support rendering SVG arcs/beziers for points with `cornerRadius`. Include logic to constrain the maximum radius based on segment lengths.

## 2. Polygon Quick Start

- [x] 2.1 Add an "Add Polygon" button to the Blocks panel in `apps/admin/src/components/customization/customization-template-panels.tsx`.
- [x] 2.2 Implement logic to insert a new `vector` shape layer with points arranged in a regular polygon (e.g., 6 sides) centered in the viewport.

## 3. Vector Bounding Box Transform

- [x] 3.1 Modify `CanvasLayer` in `apps/admin/src/components/customization/customization-template-editor.tsx` to enable `<ResizeHandles />` for `vector` shapes when selected and not in Edit Mode.
- [x] 3.2 Ensure resizing the bounding box correctly scales the internal SVG paths without breaking relative coordinates.

## 4. Hover to Add Point

- [x] 4.1 Implement edge hover detection in `VectorPointOverlay` for `vector` shapes to find the closest point on the path to the cursor.
- [x] 4.2 Display a preview point on the SVG overlay when hovering over a valid edge.
- [x] 4.3 Add click handler to insert a new `VectorPoint` at the hovered position into the `shape.vectorPath.points` array.

## 5. Corner Radius UI

- [x] 5.1 Add a "Corner Radius" number input to the "Vector Points" table in `customization-template-inspector.tsx`.
- [x] 5.2 Ensure updating the corner radius re-renders the shape correctly.
- [x] 5.3 (Optional) Display a small corner radius drag handle near the selected sharp corner point on the canvas in `VectorPointOverlay`.
