## Context

The current `vector` shape tool relies solely on a Pen Tool (click-drag for bezier curves). This UX is too difficult for ordinary users who just want to trace the outline of a cup. The goal is to provide a simpler, Figma-like UX:
1. Drop a primitive shape (e.g., Polygon).
2. Use a bounding box to scale/rotate it roughly into place.
3. Double click to edit nodes.
4. Hover over edges to add new points.
5. Use Corner Radius to round off sharp corners without manually tweaking bezier handles.

## Goals / Non-Goals

**Goals:**
- Provide a "Polygon" quick-start mode for vector drawing.
- Enable bounding box transforms (scale, rotate) for `vector` shapes.
- Enable adding points to existing path edges by clicking on them.
- Support `cornerRadius` on vector points to auto-round sharp corners.

**Non-Goals:**
- Boolean operations (unite, subtract, intersect).
- Complex multi-path compound shapes (the `vector` shape remains a single continuous path, but its editing UX is improved).
- Pen Tool overhaul (the current Pen Tool remains as is, just supplemented by these new methods).

## Decisions

- **Bounding Box Transforms**: We will re-enable `<ResizeHandles />` for vector shapes in `CanvasLayer`. Since `vectorPath.points` uses normalized `xRatio` and `yRatio` relative to the bounding box, resizing the bounding box will automatically scale the points inside.
- **Hover-to-Add-Point**: In Node Edit mode, we will track mouse movement over the SVG paths using point-to-line distance calculations. If within threshold, a preview point is shown. Clicking will insert a new `VectorPoint` into the `points` array between the two adjacent points.
- **Corner Radius**: `VectorPoint` will get an optional `cornerRadius` number. `vectorPointsToSvgPathD` will be updated to detect corner points with `cornerRadius > 0` and insert SVG Arc (`A` command) or Bezier Curve segments instead of straight lines connecting to the point.

## Risks / Trade-offs

- [Risk] Bounding box aspect ratio changes might distort Bezier handles. -> Mitigation: Since handles are stored as relative `xRatio`/`yRatio`, they will stretch along with the bounding box, which is standard expected behavior.
- [Risk] Corner radius calculation math can be complex for sharp angles. -> Mitigation: Use a robust algorithm (clamping the max radius to half the shortest adjacent segment) to prevent arcs from overlapping.
