## 1. Viewport State And Toolbar

- [x] 1.1 Add canvas viewport state for `mode`, `zoom`, `pan`, and transient zoom input in the admin canvas component.
- [x] 1.2 Replace the read-only zoom percentage with an editable percentage input that commits valid numeric values.
- [x] 1.3 Keep zoom decrement and increment controls synchronized with the editable percentage input.
- [x] 1.4 Add an `Edit` / `View` segmented control to the canvas toolbar.

## 2. Fit And Focus Behavior

- [x] 2.1 Add workspace and canvas refs needed to measure the visible viewport and rendered background.
- [x] 2.2 Implement `Fit` so it computes fit-to-viewport zoom from workspace and background dimensions.
- [x] 2.3 Reset pan during `Fit` so the background canvas is centered and visible.
- [x] 2.4 Run the same fit behavior after a background is first available so the initial canvas position is usable.

## 3. View Mode Pan

- [x] 3.1 Render the background canvas through editor-only translate and scale transforms.
- [x] 3.2 In `View` mode, drag gestures on the workspace pan the viewport instead of selecting or moving layers.
- [x] 3.3 Ensure View mode pointer interactions do not trigger layer selection, layer drag, resize handles, or path editing.

## 4. Edit Mode Preservation

- [x] 4.1 Keep existing Edit mode layer selection, movement, resize, lock behavior, and path point editing.
- [x] 4.2 Ensure intrinsic-pixel coordinate calculations still divide pointer deltas by zoom and ignore pan correctly.
- [x] 4.3 Ensure empty-canvas click clears selection only in Edit mode.

## 5. Verification

- [x] 5.1 Run `pnpm --filter admin build`.
- [x] 5.2 Run `openspec validate customization-editor-canvas-viewport --strict`.
- [x] 5.3 Run `./init.sh`.
- [x] 5.4 Update `feature_list.json`, `progress.md`, and `session-handoff.md` with evidence after implementation.
