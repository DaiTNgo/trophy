## Why

The current customization admin screen has grown from a block form into an editor-like workflow, but its UI and model still couple shopper fields, visual stack, and placement into one block structure. Trophy needs a deliberate editor model before adding text paths, shape clipping, layer stack management, and precise canvas controls.

## What Changes

- **BREAKING**: Replace the current block-only customization template contract with an editor model that separates `background`, `layers`, and `formFields`.
- Add a Figma-style admin editor with a top document header, left vertical rail, central canvas, and right selection inspector.
- Add left-rail tabs for `Blocks`, `Layers`, `Form`, and `Background`.
- Add Text layers with max-line rules, min/max font fitting, color/font policies, alignment, and preset/custom text paths.
- Add Image Shape layers with fixed shape types, aspect-ratio locking, cover-fit upload behavior, clipped rendering, and shopper crop pan/zoom.
- Separate visual layer stack from shopper form order.
- Add a full-screen Preview dialog that simulates the shopper experience against the current draft.
- Add delete-with-undo and basic editor keyboard shortcuts.
- Keep one background image per template; background replace/remove preserves existing layer geometry but publish requires a background.

## Capabilities

### New Capabilities

- `customization-editor-authoring`: Admin editor UI, canvas interactions, layer stack, form order, background management, preview dialog, and editor shortcuts for customization templates.
- `customization-editor-model`: Shared template, layer, form-field, text path, image shape, crop, validation, and runtime value contracts for the editor-based customization model.

### Modified Capabilities

None.

## Impact

- `packages/customization`: replace shared customization contracts, validation, text fitting, image crop, and render/export helpers with editor-model equivalents.
- `apps/admin`: redesign the customization template page into the editor workspace and wire it to the new model.
- `apps/storefront`: update shopper customization rendering and form generation to consume `layers` and `formFields`.
- `apps/backend`: update template persistence, publish validation, public template APIs, design validation, and export routes for the new contract.
- Existing draft customization templates in the old block-only format are not preserved as a compatibility target during dev-mode implementation.
