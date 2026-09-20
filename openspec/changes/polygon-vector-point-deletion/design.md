## Context

Polygon layers in the Trophy Customization Editor are represented as `image_shape` layers with `shape: { type: "vector", vectorPath: { points, closed: true } }`. When a polygon or vector shape layer is selected, the right Inspector panel renders `VectorPointsTable`, displaying coordinate inputs (X, Y) and curve/corner configurations for each vertex. However, there was no deletion button in the Inspector, and canvas-level deletion lacked a minimum vertex constraint, risking corrupted polygon geometry.

## Goals / Non-Goals

**Goals:**
- Provide a clean, compact delete button (`Trash2`) on each point header in `VectorPointsTable`.
- Enforce the 3-point minimum rule: prevent deletion when `points.length <= 3` (disabled button in Inspector with explanatory tooltip, suppressed keyboard shortcut on canvas).
- Synchronize selection both ways: clicking a point card in the Inspector selects the point on the canvas (`onSelectPoint(point.id)`).
- When the currently selected point is deleted, clear the selection (`onSelectPoint("")`).

**Non-Goals:**
- Allowing polygons or closed shapes with fewer than 3 points (geometrically invalid).
- Automatically deleting the entire layer when points reach 0 (layer deletion is handled by layer-level controls).

## Decisions

### 1. Header Placement in Point Cards
- **Decision**: Place a small `Trash2` button (`size-3.5`) in the card header, directly next to the `Corner / Smooth` type selector.
- **Rationale**: Keeps the point cards compact without increasing vertical scroll height, while clearly grouping vertex-level actions together.

### 2. Guarding the 3-Point Boundary
- **Decision**: Check `canDelete = vectorPath.points.length > 3`. If false, set `disabled={true}`, add `cursor-not-allowed opacity-40`, and provide title/tooltip: `"A closed polygon must have at least 3 points"`.
- **Canvas shortcut alignment**: In `VectorPointOverlay`, pass `canDelete` or check `points.length > 3` before executing `onDelete` to prevent keyboard deletion below 3 points.

### 3. Bidirectional Selection
- **Decision**: Wire `onSelectPoint?: (pointId: string) => void` down from `Inspector` → `ImageShapeInspector` → `VectorPointsTable`. Clicking anywhere on a point card triggers selection, with `stopPropagation` on inputs and buttons to prevent unintended selection toggle.

## Risks / Trade-offs

- **[Accidental click on Delete]** → Point cards are distinct, and the delete icon requires an explicit click on a small button separated from coordinate inputs. Undo is supported via normal template state history.
