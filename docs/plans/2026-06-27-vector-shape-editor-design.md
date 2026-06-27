# Vector Shape Editor — Design

## Problem

Admin operators need to create custom clip-path shapes directly on the editor canvas beyond the 6 built-in presets (rectangle, circle, ellipse, rounded_rectangle, star, heart). Shapes must be per-template (no shared library), editable after creation, and support both straight edges and curves.

## Data Model

New `ShapeType` value: `"vector"`

```typescript
type VectorPointType = "corner" | "smooth";

type VectorPoint = {
  id: string;
  xRatio: number;            // relative to layer width/height (0-1)
  yRatio: number;
  pointType: VectorPointType;
  inHandle?: { xRatio: number; yRatio: number };
  outHandle?: { xRatio: number; yRatio: number };
};

// ImageShapeEditorLayer.shape adds:
vectorPath?: {
  points: VectorPoint[];
  closed: boolean;
};
```

Built-in shapes remain unchanged — vector is an additional mode alongside them.

## Storage

`vectorPath` is serialized inside `blocksJson` as part of the layer shape, exactly like `customShapeId` would have been. No new database table.

## Canvas Drawing Flow

1. **Enter Draw Mode** — user clicks "Draw shape" in Blocks panel → canvas enters draw mode
2. **Add points** — click adds `corner` point; click-drag adds `smooth` point with handles
3. **Close path** — click first point or press "Close Shape" button
4. **Convert to layer** — shape becomes a normal image shape layer with `type: "vector"` and `vectorPath`
5. **Post-creation editing** — select layer → points become draggable on canvas, inspector shows point list

## Point Editing

When a vector layer is selected:
- All points shown as small draggable circles
- **Single click** a point shows its handles (blue dots at handle ends)
- **Drag** a point or handle
- **Double-click** a point to toggle `corner` ↔ `smooth`
- **Delete** selected point (Backspace/Delete)
- Inspector shows point table with x/y numeric inputs

## Clip-Path Rendering

Convert `vectorPath.points` to SVG path `d` attribute:

- First point → `M x,y`
- Subsequent points:
  - If prev point has `outHandle` AND current has `inHandle` → `C` (cubic bezier)
  - If only prev has `outHandle` → `Q` (quadratic)
  - Otherwise → `L` (line)
- If `closed` → `Z`

Render as CSS `clip-path: path('...')` on DOM side, and as `<clipPath><path d="..." /></clipPath>` on SVG export.

## Components

- `VectorDrawTool` — overlay on canvas when in draw mode (handles point placement, preview line/curve, close path button)
- `VectorPointEditor` — renders draggable points + handles on selected vector layer
- `VectorInspector` — point table in the right sidebar for numeric editing

## No Backend Changes

No new API routes. Vector data lives entirely in `blocksJson` via the existing template save/publish flow. SVG export already resolves shape clip via `shapeClipSvg()` — add a `"vector"` case there.
