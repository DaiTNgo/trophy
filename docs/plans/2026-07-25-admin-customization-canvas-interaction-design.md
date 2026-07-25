# Admin Customization Canvas Interaction Design

## Scope

Apply one click-driven interaction model to the customization canvas used by both Product Detail and Create Product in the admin app.

## Behavior

- Remove the manual `Edit` / `View` mode toggle.
- Clicking or dragging a layer selects it and keeps pointer interaction on that layer.
- A selected layer can be moved, resized, rotated, or inspected without moving the viewport.
- Clicking the canvas background clears layer/path/point selection and starts viewport panning.
- Locked layers can be selected for inspection but cannot be moved.
- Polygon drawing remains an explicit temporary interaction state and is unaffected by the normal canvas pan behavior.
- The shopper-oriented `PreviewDialog` remains a separate preview workflow.

## Implementation

The shared admin `EditorCanvas` derives interaction ownership from the pointer target instead of storing a canvas mode. Background pointer events start viewport pan; `CanvasLayer` stops propagation and owns layer manipulation. Both existing editor hooks continue to provide the same selection and update callbacks, so Product Detail and Create Product receive identical behavior without duplicated mode state.

## Verification

Run the admin build and relevant type checks, then inspect the diff for accidental changes outside the shared canvas interaction.
