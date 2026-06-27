## Context

Admin customization editor currently supports 6 built-in shape presets for image shape layers. Trophy designs often need custom clip shapes that match the specific cup geometry. A per-template vector drawing tool is preferred over a shared shape library since shapes are tied to each template's background context.

## Goals / Non-Goals

**Goals:**
- Allow admins to draw vector shapes directly on the editor canvas (corner + smooth points with Bézier handles)
- Allow post-creation point editing: drag, toggle corner/smooth, adjust handles, delete points
- Store vector data entirely in `blocksJson` (no new DB tables or API routes)
- Render vector shapes as CSS `clip-path: path()`, SVG `<clipPath>`, and PDF paths
- Keep existing 6 built-in shapes unchanged

**Non-Goals:**
- No shared shape library or cross-template reuse
- No SVG file upload (Figma-like paste SVG path in inspector is optional v2)
- No path operations like merge/subtract/intersect (Boolean ops)
- No storefront vector shape creation (read-only for shoppers)

## Decisions

**1. Store vector points as SVG path `d` attribute vs. raw point array**
Store as `VectorPoint[]` with xRatio/yRatio and handles. This is more structured for editing (each point has an id, type, handles) and can be converted to SVG path string for rendering. Storing the SVG `d` string directly would require parsing/re-serializing during edits.

**2. Coordinates relative to layer bounds vs. background**
Points use `xRatio`/`yRatio` relative to the layer's width/height (0-1 range). This matches the existing geometry model (ratios not pixels) and allows layer resize without breaking the shape.

**3. Canvas draw mode as a separate editor phase**
When the user clicks "Draw shape", the editor enters a modal draw phase — all other interactions (drag, resize, select) are disabled. A floating panel shows Close/Undo/Cancel buttons. This prevents accidental layer manipulation while drawing.

**4. Point editing reuses existing canvas resize handles pattern**
Selected vector layers show draggable point circles and handle lines, built on the same pointer-event math as the existing resize handles. No Konva or extra library needed.

## Risks / Trade-offs

- **Complex point editing UX** → Mitigation: start with drag-to-move points and double-click toggle. Handle adjustment (dragging blue dots) and delete point are secondary.
- **Performance with many points** → Mitigation: max 100 points enforced, and vector shapes are single-layer clip-paths, not hundred-element scenes. DOM handles it fine.
- **SVG export path mismatch** → Mitigation: `vectorPointsToSvgPathD()` is the single source of truth shared between CSS `clip-path`, SVG `<clipPath>`, and PDF export.
