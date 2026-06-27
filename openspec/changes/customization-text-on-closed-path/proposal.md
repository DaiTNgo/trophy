## Why

Admins need a Figma-like Text on path authoring flow for cup designs, where text can follow a circular or oval path directly on the canvas. The current text path support can render preset/custom paths, but the authoring UX does not match the requested closed ellipse workflow.

## What Changes

- Add a dedicated `Text on path` block in the admin editor Blocks panel.
- Create Text on path layers as one-line closed ellipse/oval path text by default.
- Replace the previous custom Bezier authoring direction for this flow with canvas handles for moving, resizing, start position, and orientation/flip.
- Persist closed ellipse path state in the editor model so admin, Preview, storefront, and export rendering can stay deterministic.
- Enforce one-line fitting behavior for Text on path: reduce font size to min, then silently trim overflow.
- No open arc path or Pen mode is included in this change.

## Capabilities

### New Capabilities

- `customization-text-on-closed-path`: Admin and runtime behavior for closed ellipse Text on path layers in the customization editor.

### Modified Capabilities

- None.

## Impact

- Affects shared customization text path contracts, validation, fitting, and SVG path helpers in `packages/customization`.
- Affects admin editor Blocks panel, canvas handles, text inspector, and Preview rendering in `apps/admin`.
- Affects storefront runtime rendering for published Text on path layers in `apps/storefront`.
- Affects backend validation/export rendering if production previews consume shared text path helpers in `apps/backend`.
