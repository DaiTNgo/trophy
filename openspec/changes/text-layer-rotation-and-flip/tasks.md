## 1. Data Model & Runtime Mapping

- [x] 1.1 Add `flipHorizontal` and `flipVertical` optional properties to `TextEditorLayer.text` and `RuntimeTextLayer` in `packages/customization/src/types.ts`.
- [x] 1.2 Update runtime layer resolution in `packages/customization/src/design.ts` to forward flip properties to `RuntimeTextLayer`.
- [x] 1.3 Add unit tests in `packages/customization/src/index.test.ts` covering text layer flip properties and runtime mapping.

## 2. Admin Canvas Editor & Rotation Handle

- [x] 2.1 Implement on-canvas rotation handle for selected Text Layers in `apps/admin/src/components/customization/customization-template-editor.tsx` and `customization-template-editor-text.tsx` with free pointer dragging and 15° Shift-snapping.
- [x] 2.2 Update `EditorTextLayer` in `apps/admin/src/components/customization/customization-template-editor-text.tsx` to apply inner-content horizontal/vertical flip transforms for straight and path text.
- [x] 2.3 Verify bounding box, resize handles, and delete button stability when text is rotated and flipped.

## 3. Admin Inspector Controls

- [x] 3.1 Add rotation degree input (`0° - 359°`) and ±90° step buttons to `TextInspector` / `PositionFields` in `apps/admin/src/components/customization/customization-template-inspector-sections.tsx`.
- [x] 3.2 Add horizontal (`↔`) and vertical (`↕`) flip toggle buttons to `TextInspector` in `apps/admin/src/components/customization/customization-template-inspector-sections.tsx`.

## 4. Multi-Surface Rendering (Storefront & Export)

- [x] 4.1 Update Storefront runtime preview in `packages/customization-react/src/preview-layers.tsx` to render rotated and flipped text (both straight and path text).
- [x] 4.2 Update `apps/admin/src/lib/raster-export.ts` to apply flip transformations to SVG text elements.
- [x] 4.3 Update `apps/admin/src/lib/pdf-export.ts` to combine rotation and flip transformations in the affine matrix for straight text and SVG path text.

## 5. Verification & Testing

- [x] 5.1 Run test suites: `pnpm --filter customization test`, `pnpm --filter admin build`, `pnpm --filter router-cf build`.
- [x] 5.2 Run `./init.sh` to ensure full monorepo cleanliness and restartability.
