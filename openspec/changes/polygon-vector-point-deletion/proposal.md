## Why

In the Customization Template Editor, operators currently cannot delete individual points of a polygon or vector shape from the Inspector panel (`VectorPointsTable`), leaving them reliant on an undocumented keyboard shortcut (`Delete`/`Backspace`) on the canvas. Furthermore, existing point deletion lacks a minimum vertex guard, which can reduce a closed polygon below 3 vertices and break the geometric clipping mask. Providing an explicit point delete action in the inspector with a 3-point minimum constraint makes editing polygons reliable, intuitive, and error-free.

## What Changes

- Add a delete point button (`Trash2`) to the header of each point card in `VectorPointsTable` in `customization-template-inspector-sections.tsx`.
- Enforce the **Vector Point Deletion Constraint**: disable point deletion in the inspector (and suppress keyboard delete on canvas) when `vectorPath.points.length <= 3` for closed vector paths / polygons.
- Implement two-way selection synchronization: clicking a point card in `VectorPointsTable` selects and highlights the corresponding point on the canvas (`onSelectPoint`).
- Handle active point deletion cleanly by clearing or updating `selectedVectorPointId`.

## Capabilities

### New Capabilities
- `polygon-vector-point-deletion`: Inspector point deletion and minimum vertex guard for polygon and vector layers.

### Modified Capabilities
<!-- None -->

## Impact

- Affected files:
  - `apps/admin/src/components/customization/customization-template-inspector-sections.tsx` (`VectorPointsTable`, `ImageShapeInspector`)
  - `apps/admin/src/components/customization/customization-template-inspector.tsx` (`Inspector`)
  - `apps/admin/src/components/customization/customization-template-editor-vector.tsx` (`VectorPointOverlay`, `VectorPointHandle`, `useKeyboardDelete`)
- No backend API or database schema changes.
