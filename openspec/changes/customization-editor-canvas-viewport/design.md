## Context

The admin customization editor already has the approved document layout and editor model. The current canvas implementation uses a local `zoom` state, fixed zoom buttons, a read-only percentage label, and normal scroll overflow. Layer selection and layer movement are always active when the user interacts with a layer.

Admins need a Figma-like workspace distinction: sometimes they are editing objects, and sometimes they are navigating the canvas. Viewport movement must be an editor convenience only. It must not alter layer geometry, background dimensions, form fields, or any saved template data.

## Goals / Non-Goals

**Goals:**

- Add explicit `Edit` and `View` canvas modes.
- Allow direct numeric zoom percentage entry.
- Keep zoom buttons and make `Fit` compute a real fit-to-viewport zoom instead of using a fixed percentage.
- Allow View mode to pan the canvas freely by dragging the workspace.
- Provide a focus/fit action that recenters the background canvas when it has been moved out of view.
- Preserve existing Edit mode layer interactions: select, move, resize, lock behavior, and custom path editing.

**Non-Goals:**

- No change to the customization template model.
- No backend, storefront, export, or database changes.
- No full editor history implementation.
- No new persisted user preference for zoom, pan, or mode in this pass.
- No multi-page canvas or multiple background support.

## Decisions

### Use explicit editor viewport state

The canvas component will own `mode`, `zoom`, and `pan` state. `zoom` is a scalar, and `pan` is a screen-space offset used only to transform the displayed canvas inside the workspace viewport.

This is preferred over using the scroll container as the primary state because the requested UX is closer to Figma: the user moves the canvas plane, then can focus it back into view. Scroll-only behavior would be simpler, but it would make `Fit` and drag-pan feel like browser scrolling instead of a design editor viewport.

### Keep Edit and View behavior mutually exclusive

`Edit` mode keeps existing layer semantics: clicking selects layers, dragging moves unlocked layers, handles resize layers, and custom path edit can manipulate points. `View` mode suppresses layer editing from pointer interactions and uses drag gestures to pan the viewport.

This avoids accidental layer movement while admins are inspecting the canvas. It also keeps the current keyboard nudging behavior scoped to Edit semantics.

### Make zoom input controlled and clamped

The toolbar will render an editable percentage input. Admins can type values like `50`, `100`, or `150`; the component normalizes these into a clamped zoom range. Increment and decrement buttons adjust by a fixed percentage step.

Invalid or empty transient input should not corrupt zoom. The implementation can keep a small draft input state and commit on blur/Enter, or parse defensively on change.

### Fit computes from viewport and background dimensions

`Fit` will measure the visible workspace and the background intrinsic dimensions, then choose the largest zoom that fits the full background with padding. It will also reset pan so the canvas is centered in the viewport.

This replaces the current fixed `0.72` fit value and makes the action reliable across different screen sizes and background aspect ratios.

## Risks / Trade-offs

- **Coordinate drift risk** -> Keep all layer geometry math in intrinsic pixels and apply zoom/pan only as CSS transform around the rendered canvas.
- **Pointer event conflict risk** -> Gate pointer handlers by mode: View mode owns viewport dragging; Edit mode owns layer dragging and resize handles.
- **Zoom input edge cases** -> Clamp committed zoom and preserve the previous valid zoom when the input is empty or invalid.
- **Fit measurement timing** -> Use a viewport ref and compute fit after background exists; if dimensions are unavailable, fall back to the existing default zoom.

## Migration Plan

1. Add viewport state and toolbar controls to the admin canvas component.
2. Replace fixed fit behavior with viewport-measured fit and recentering.
3. Gate layer pointer interactions by `Edit` mode and add drag-pan behavior in `View` mode.
4. Verify admin build and root initialization.

Rollback is a code rollback. No data migration is required.

## Open Questions

None for v1. Future passes can add persisted per-admin viewport preferences or keyboard shortcuts such as Space-to-pan if needed.
