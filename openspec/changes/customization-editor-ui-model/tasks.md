## 1. Shared Editor Model

- [x] 1.1 Replace the shared customization template contract with `background`, `layers`, and `formFields` types.
- [x] 1.2 Add Text layer, Image Shape layer, form field, text policy, text path, shape, and crop value types.
- [x] 1.3 Replace default fixtures with editor-model templates that include one background, Text layers, Image Shape layers, and linked form fields.
- [x] 1.4 Implement geometry helpers for ratio-to-background-pixel conversion and background-pixel-to-ratio persistence.
- [x] 1.5 Implement shared publish/runtime validation for background presence, layer-field references, text font ranges, path max-line rules, style policy values, and hidden layer exclusion.
- [x] 1.6 Implement shared text fitting that reduces font size and silently trims overflow when minimum font size is reached.
- [x] 1.7 Implement shared text path helpers for preset path geometry and custom Bezier point normalization.
- [x] 1.8 Implement shared image shape helpers for cover fit, shape clip path generation, uniform crop scale, pan ratios, and crop clamping.
- [x] 1.9 Update shared tests to cover layer stack vs form order, hidden layers, text path one-line rules, text trimming, image shape clipping, and uniform crop metadata.

## 2. Backend Contract And Persistence

- [x] 2.1 Update customization template API request/response payloads to use the editor model.
- [x] 2.2 Update D1 persistence serialization for background, layers, and form fields in template revisions.
- [x] 2.3 Update template publish validation to reject missing background and invalid layer/form references.
- [x] 2.4 Update public template retrieval for storefront consumers to return the editor model.
- [x] 2.5 Update design validation routes to validate shopper values against form fields and linked layers.
- [x] 2.6 Remove old block-only backend paths that are no longer used by the new editor contract.

## 3. Admin Editor Shell

- [x] 3.1 Rebuild the customization template page into a top header, left vertical rail, central canvas, and right inspector layout.
- [x] 3.2 Implement Background tab upload, replace, remove, thumbnail, filename, and dimensions behavior.
- [x] 3.3 Implement empty-background canvas upload/dropzone state and disable block creation until background exists.
- [x] 3.4 Implement canvas viewport zoom, pan, fit, reset, and intrinsic-pixel coordinate display.
- [x] 3.5 Implement selection behavior for empty canvas clicks and topmost overlapping visible layers.

## 4. Admin Blocks, Layers, And Form Tabs

- [x] 4.1 Implement Blocks tab creation for Text and Image Shapes with v1 shape list.
- [x] 4.2 Add new layers at the top of the visual stack and select them immediately.
- [x] 4.3 Implement Layers tab selection, visual drag reorder, rename, hide/show, lock/unlock, and muted hidden state.
- [x] 4.4 Implement immediate layer delete with Undo toast that restores the layer, linked form field, stack order, form order, properties, and selection.
- [x] 4.5 Implement Form tab drag reorder, field label, help text, placeholder, required/optional, and layer selection.
- [x] 4.6 Ensure Form tab order changes do not mutate layer z-index and Layers tab reorder does not mutate form order.
- [x] 4.7 Implement editor keyboard shortcuts for delete, undo delete, escape, arrow nudge, and shift-arrow nudge.

## 5. Admin Text Editing

- [x] 5.1 Implement Text inspector Position & Size with X/Y/W pixel inputs and derived read-only height.
- [x] 5.2 Implement Text canvas move and horizontal-only resize handles.
- [x] 5.3 Implement Text typography controls for fixed/shopper-selectable font, fixed/shopper-selectable color, and alignment.
- [x] 5.4 Implement Text fit controls for max lines, min font size, and max font size.
- [x] 5.5 Implement Text sample/default render text editing in the inspector.
- [x] 5.6 Implement preset text path controls for straight, arc up/down curve amount, and circle top/bottom radius.
- [x] 5.7 Implement custom path edit mode with Bezier anchors, handles, double-click entry, inspector entry, Done, and Esc exit.
- [x] 5.8 Clamp path Text layers to max lines equal to 1 and keep alignment resolved along path length.

## 6. Admin Image Shape Editing

- [x] 6.1 Implement Image Shape inspector Position & Size with X/Y/W/H pixel inputs.
- [x] 6.2 Implement readonly shape type display and aspect-ratio lock controls with shape-specific defaults.
- [x] 6.3 Implement canvas resize handles for aspect-locked and free-resize image shapes.
- [x] 6.4 Render editor-only image shape outlines/fills without adding published fill/stroke properties.
- [x] 6.5 Prevent changing image shape type after creation.

## 7. Preview Dialog And Storefront Runtime

- [x] 7.1 Replace same-page admin preview mode with a full-screen Preview dialog that preserves editor state.
- [x] 7.2 Render preview form controls from `formFields` order and linked layer policies.
- [x] 7.3 Render preview canvas layers from visual z-index and hidden-layer rules.
- [x] 7.4 Implement Preview image upload crop with cover fit, shape clipping, pan, and uniform zoom only.
- [x] 7.5 Update storefront customization form to consume editor-model `formFields` and `layers`.
- [x] 7.6 Update storefront rendering for text fitting, text paths, image shapes, shape clipping, and uniform image crop.

## 8. Export And Runtime Output

- [x] 8.1 Update design derivation helpers to build runtime layers from template layers plus shopper values.
- [x] 8.2 Update SVG export helpers to render editor-model text, text paths, image shapes, clipping, and z-order.
- [x] 8.3 Update PDF export helpers to use the editor-model geometry and clipping semantics.
- [x] 8.4 Remove old block-only export helpers once all callers use the editor model.

## 9. Verification And Handoff

- [x] 9.1 Run `pnpm --filter customization test`.
- [x] 9.2 Run `pnpm --filter admin build`.
- [x] 9.3 Run `pnpm --filter router-cf build` and `pnpm --filter router-cf typecheck` after storefront updates.
- [x] 9.4 Run `pnpm --filter backend build` and `pnpm --filter backend check` after backend updates.
- [x] 9.5 Run `openspec validate customization-editor-ui-model --strict`.
- [x] 9.6 Run `./init.sh` from the repository root.
- [x] 9.7 Update `feature_list.json`, `progress.md`, and `session-handoff.md` with implementation evidence and remaining risks.
