# Customization Preview Minimal Overlay Design

Date: 2026-07-16

## Summary

Reduce the amount of persistent preview chrome in `@trophy/customization-react` so the product artwork gets more visible area by default. Replace the current fixed top header and sticky action rail with in-canvas floating controls and selection-driven behavior.

## Current Problem

The shared preview currently reserves vertical space for:

- a top bar with mode switching and zoom controls
- a second fixed-height action rail for uploaded-image controls or helper copy

This keeps interactions discoverable, but it reduces the visible area of the customized product, especially on shorter desktop viewports and mobile.

## Goals

- Maximize preview area for the product image and customization result.
- Remove persistent controls that are only useful in a subset of states.
- Keep preview zoom controls always reachable.
- Keep uploaded-image controls available only when an uploaded image is selected.
- Preserve the current image editing capability and canvas pan behavior.
- Leave read-only preview behavior minimal and clean.

## Non-Goals

- No redesign of the customization form.
- No change to customization data contracts or image editing math.
- No new explanatory hints or guidance copy in the preview.
- No attempt to preserve the current explicit `View/Edit` toggle model.

## Decision

Adopt a minimal, context-driven preview:

- remove the explicit `View/Edit` toggle
- remove the fixed preview header
- remove the fixed sticky action rail
- place canvas zoom controls as a floating dock at the bottom-right
- place selected-image actions as a floating dock at the bottom-left
- use selection state to determine whether the user is editing an uploaded image or viewing/panning the full canvas

## Interaction Model

There is no visible mode switch.

### Default state

- No uploaded image is selected.
- The preview behaves like the current view mode.
- Dragging the canvas pans the preview.
- The bottom-right floating dock is visible with `zoom out`, `zoom in`, and `fit`.
- The bottom-left image-action dock is hidden.

### Selected-image state

- Clicking an uploaded image selects it.
- The selected-image outline and resize handles continue to work as they do now.
- Dragging on the selected image adjusts that image, not the canvas.
- The bottom-left floating dock appears with image-specific actions such as rotate, move, and reset.
- The bottom-right zoom dock remains visible.

### Deselect behavior

- Clicking an empty part of the canvas clears the selected image.
- Once deselected, the preview returns to the default viewing state.
- Canvas drag-to-pan becomes active again.

### Read-only behavior

- Read-only preview does not expose image-edit actions.
- The bottom-left dock never appears.
- The bottom-right zoom dock remains available so admins can inspect the preview.
- Canvas pan remains available.

## Control Placement

### Bottom-right dock

Purpose: whole-canvas controls.

Contents:

- zoom out
- zoom in
- fit to view

Reasoning:

- stable location independent of object selection
- easy to reach on future mobile layouts
- does not consume layout height

### Bottom-left dock

Purpose: selected uploaded-image controls.

Contents:

- rotate left / right
- directional nudges
- reset
- any other existing image-only actions that remain necessary

Reasoning:

- visually separates canvas controls from selected-object controls
- keeps the meaning of each dock stable
- scales more naturally to mobile than a top toolbar

## Component Changes

Target file: `packages/customization-react/src/index.tsx`

Expected structural changes:

- remove the current top bar that contains mode buttons, zoom input, and helper text
- remove the current fixed-height sticky action rail
- render floating control groups inside the preview viewport instead of above it
- keep the preview canvas container and existing image/text rendering flow intact

State changes:

- stop exposing the visible `mode` toggle in the UI
- replace the explicit edit/view mental model with selection-driven behavior
- preserve enough internal state to distinguish:
  - selected uploaded image
  - no selected uploaded image
  - read-only preview

Behavior changes:

- when no image is selected, pointer drag should pan the canvas
- when an uploaded image is selected, image interaction should take precedence over canvas panning
- clicking empty canvas should clear selection

## Mobile Considerations

This design intentionally prepares the preview for mobile without adding a separate mobile-only branch yet.

Why this is a better base for mobile:

- no stacked bars above the preview
- controls live near the lower corners, which are easier to reach
- control groups are already separated by responsibility
- selection-driven controls avoid needing a dedicated mobile mode switch

Potential implementation details to validate during build:

- floating docks should not overlap each other on narrow widths
- dock spacing should account for safe-area insets when needed later
- icon-only buttons must remain large enough for touch

## Edge Cases

- If no uploaded image value exists, the bottom-left dock must stay hidden.
- If the selected uploaded image is removed or replaced, selection should clear safely.
- If the preview is read-only, selecting an uploaded image must not reveal edit actions.
- If the canvas is zoomed and then deselected, the zoom/pan state should remain unchanged.

## Testing Impact

Verification should focus on shared preview behavior, not business logic.

Recommended checks:

- `@trophy/customization-react` typecheck
- storefront typecheck/build because storefront consumes the shared preview
- admin build because admin also consumes the shared preview

Behavior to validate manually:

- preview area is visibly larger than before
- zoom dock always appears in the bottom-right
- image-action dock appears only when an uploaded image is selected
- clicking empty canvas returns to pan behavior
- read-only preview shows no edit controls

## Recommendation

Implement this as a focused UI behavior change inside `@trophy/customization-react` without changing the surrounding form layout, backend contracts, or customization value schema.
