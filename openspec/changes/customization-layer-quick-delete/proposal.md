## Why

In the Admin Customization Template Editor (`EditorCanvas`), operators currently have to navigate to the Layers panel on the left sidebar to delete a layer, or rely on keyboard shortcuts that are not universally wired or discoverable. Adding an on-canvas quick delete action directly above the selected layer allows operators to iterate, prune, and reorganize customization layouts much faster and more intuitively.

## What Changes

- Add a quick delete button directly on `CanvasLayer` when a layer is selected.
- Position the delete button floating above the top-right corner (`bottom: calc(100% + 8px)`, `right: 0`), preventing overlap with the North-East (`ne`) resize handle.
- Maintain a consistent visual scale (~24x24px) across all canvas zoom levels (5% to 200%) via counter-zoom scaling (`transform: scale(1 / zoom)`).
- Hide the delete button when the layer is locked (`layer.locked`), during path editing (`pathEditing`), or during vector drawing (`isDrawing`).
- Wire one-click deletion through `EditorCanvas` across all three editor entry points (Product Detail Customization Editor, Create Product Customization, and Customization Templates).
- Trigger immediate layer and associated form field deletion, flash notification, and undo history support.

## Capabilities

### New Capabilities
- `customization-layer-quick-delete`: On-canvas quick deletion action for selected customization layers on the EditorCanvas.

### Modified Capabilities
<!-- None -->

## Impact

- Affected code:
  - `apps/admin/src/components/customization/customization-template-editor.tsx` (`EditorCanvas`, `CanvasLayer`)
  - `apps/admin/src/pages/product-customization-editor.tsx`
  - `apps/admin/src/pages/create-product/create-product-customization.tsx`
  - `apps/admin/src/CustomizationTemplatePage.tsx`
- No backend API or database schema changes required.
