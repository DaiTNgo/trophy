# Progress: polygon-vector-point-deletion

## Completed Work
- Implemented `onSelectVectorPoint` prop passing through `Inspector` -> `ImageShapeInspector` -> `VectorPointsTable`.
- Added point delete button (`Trash2`) on each point card header in `VectorPointsTable`.
- Enforced 3-point minimum constraint (`canDelete = vectorPath.points.length > 3`) in `VectorPointsTable` with disabled styling and tooltip.
- Implemented `deletePoint` logic in `VectorPointsTable`, filtering out the deleted point and clearing selection if selected.
- Added click selection on each point card to synchronize selection to canvas.
- Added minimum 3-point guard and deselection on canvas keyboard delete in `VectorPointOverlay`.
- Passed `onSelectVectorPoint` from all three editor pages (`product-customization-editor.tsx`, `CustomizationTemplatePage.tsx`, `create-product-customization.tsx`).
- Recorded domain term `Vector Point Deletion Constraint` in `CONTEXT.md`.
- Verified admin build (`pnpm --filter admin build`) and unit tests (`pnpm --filter admin test`).
- Verified full monorepo build with `./init.sh` (clean exit 0).

## Current Status
- All 8 tasks complete (8/8).
- OpenSpec state: `all_done`.
