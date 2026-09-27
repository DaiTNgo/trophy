## 1. Inspector Point Deletion & Bidirectional Selection

- [x] 1.1 Pass `onSelectVectorPoint` prop through `Inspector` to `ImageShapeInspector` and `VectorPointsTable` in `apps/admin/src/components/customization/customization-template-inspector-sections.tsx`
- [x] 1.2 Add delete button (`Trash2`) to the header of each point card in `VectorPointsTable` with disabled state and tooltip when `vectorPath.points.length <= 3`
- [x] 1.3 Implement point deletion in `VectorPointsTable`, removing the point from `vectorPath.points` and clearing selection if the deleted point was selected
- [x] 1.4 Add click selection on each point card in `VectorPointsTable` to select that point on the canvas via `onSelectVectorPoint`

## 2. Canvas Keyboard Deletion Guard

- [x] 2.1 Guard canvas vector point deletion in `VectorPointOverlay` (`apps/admin/src/components/customization/customization-template-editor-vector.tsx`) so points cannot be deleted when `vectorPath.points.length <= 3`

## 3. Verification

- [x] 3.1 Run admin build and typecheck (`pnpm --filter admin build`) to ensure all prop types and components compile cleanly
- [x] 3.2 Run test suites (`pnpm --filter admin test`)
- [x] 3.3 Verify full monorepo sanity with `./init.sh`
