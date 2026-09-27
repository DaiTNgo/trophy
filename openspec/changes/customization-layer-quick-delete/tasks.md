## 1. CanvasLayer Quick Delete Component & Styling

- [x] 1.1 Add `onDelete?: () => void` prop to `CanvasLayer` in `apps/admin/src/components/customization/customization-template-editor.tsx`
- [x] 1.2 Implement the floating quick delete button in `CanvasLayer` with zoom counter-scaling (`transform: scale(1 / zoom)`), top-right positioning (`bottom: calc(100% + 8px)`, `right: 0`), styling with Lucide `Trash2`, and pointer event stopPropagation
- [x] 1.3 Conditionally render the delete button only when `selected && editing && !layer.locked && !pathEditing`

## 2. EditorCanvas Callback Wiring

- [x] 2.1 Add `onDeleteLayer?: (layerId: string) => void` prop to `EditorCanvas` and pass it to `CanvasLayer`
- [x] 2.2 Wire `onDeleteLayer` in `apps/admin/src/pages/product-customization-editor.tsx` using `editor.deleteSelectedLayer`
- [x] 2.3 Wire `onDeleteLayer` in `apps/admin/src/pages/create-product/create-product-customization.tsx` using `embeddedEditor.deleteSelectedLayer`
- [x] 2.4 Wire `onDeleteLayer` in `apps/admin/src/CustomizationTemplatePage.tsx` using `deleteSelectedLayer`

## 3. Verification

- [x] 3.1 Run admin build and typecheck (`pnpm --filter admin build`) to ensure all prop types and components compile cleanly
- [x] 3.2 Run test suites for admin and customization packages (`pnpm --filter admin test`, `pnpm --filter customization test`)
- [x] 3.3 Verify full monorepo sanity with `./init.sh`
