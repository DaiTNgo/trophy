## Context

In the Admin Customization Template Editor, operators design templates by configuring layers (Text, Text on Path, Image Shape, Vector Shape, Polygon) on the `EditorCanvas`. While selecting and moving layers happens on canvas, deleting a layer currently requires either finding the layer in the sidebar's Layers list and clicking its trash button, or using a keyboard shortcut that is not uniformly bound across all pages. Operators need a direct, on-canvas quick delete action right on the selected layer.

## Goals / Non-Goals

**Goals:**
- Render an on-canvas quick delete button directly on `CanvasLayer` when a layer is selected.
- Position the button at the top-right corner floating above the top edge (`bottom: calc(100% + 8px)`, `right: 0`), avoiding collision with the `ne` resize handle.
- Maintain consistent visual size (~24x24px) regardless of canvas zoom level via `transform: scale(1 / zoom)`.
- Restrict visibility: hide when `layer.locked`, during `pathEditing`, or during `isDrawing`.
- Prevent event bubbling on pointerdown/click to avoid accidental canvas panning or layer dragging.
- Connect the action to `deleteSelectedLayer` across all three pages that use `EditorCanvas`.

**Non-Goals:**
- Custom confirmation modal or dialog on delete (remains 1-click delete with existing flash message and undo support).
- Changing layer deletion logic or form field reconciliation (reuses existing `deleteSelectedLayer`).
- Storefront customization preview changes (this is an admin editor capability only).

## Decisions

### 1. Positioning and Resize Handle Clearance
- **Decision**: Place the delete button floating above the top-right corner with `bottom: calc(100% + 8px)` and `right: 0`.
- **Alternatives considered**:
  - *Directly on the corner*: Overlaps with the North-East (`ne`) resize handle on shapes, causing miss-clicks.
  - *Top-center floating toolbar*: Adds visual noise and can obscure text on curved paths.
  - *Left corner*: Unconventional for delete actions in creative canvas tools.

### 2. Zoom Counter-Scaling
- **Decision**: Apply `transform: scale(1 / zoom)` with `transformOrigin: "bottom right"` so the button remains a constant ~24px hit target regardless of canvas zoom factor (from 0.05 to 2.0).
- **Alternatives considered**:
  - *Native scaling with canvas*: Makes the button too small to click when zoomed out, and overly large when zoomed in.

### 3. Visibility Conditions
- **Decision**: Render the button only when `selected && editing && !layer.locked && !pathEditing`.
- **Rationale**:
  - Locked layers are read-only for inspection.
  - Path editing mode operates on individual bezier or vector control points where deleting points has different semantics.

### 4. Event Handling
- **Decision**: Intercept `onPointerDown` with `event.stopPropagation()` and `event.preventDefault()` to prevent dragging the layer or starting a canvas pan.

## Risks / Trade-offs

- **[Layer positioned close to top canvas edge]** → When a layer has `top: 0`, the floating delete button extends 8-32px outside the canvas top. Mitigation: The canvas container has padding and `overflow-hidden` with zoom/pan capabilities, ensuring the button remains visible and clickable.
- **[Accidental deletion with 1-click]** → Mitigation: Existing `undoDelete` and flash toast feedback allow operators to immediately restore deleted layers.
