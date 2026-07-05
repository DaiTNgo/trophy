## Why

The customization editor currently exposes basic zoom buttons, but admins need Figma-like viewport control for precise authoring: direct zoom percentage entry, a clear Edit/View distinction, and a reliable way to bring the canvas back into view after panning away.

This change tightens the canvas workspace UX without changing the template data model or shopper customization behavior.

## What Changes

- Add a canvas mode control with `Edit` and `View` modes.
- Make `Edit` mode the layer-authoring mode for selecting, moving, resizing, and path editing layers.
- Make `View` mode the viewport-navigation mode for panning the canvas without selecting or moving layers.
- Replace the read-only zoom percentage display with an editable percentage input.
- Keep zoom increment/decrement controls and add a Figma-like `Fit` action that recenters and scales the background canvas into the visible workspace.
- Ensure zoom and pan affect only the editor viewport, not persisted layer geometry.

## Capabilities

### New Capabilities

- `customization-editor-canvas-viewport`: Canvas viewport controls for admin authoring, including Edit/View mode separation, direct zoom percentage entry, viewport panning, and fit-to-view focus.

### Modified Capabilities

None.

## Impact

- Affected code:
  - `apps/admin/src/components/customization/customization-template-editor.tsx`
  - Potentially small prop/state wiring in `apps/admin/src/CustomizationTemplatePage.tsx` if viewport state needs to be lifted.
- No backend, storefront, shared model, or database contract changes are expected.
- Verification should include `pnpm --filter admin build` and root `./init.sh`.
