## 1. Preview State And Trigger

- [x] 1.1 Add controlled selected-item state to the storefront order lookup route.
- [x] 1.2 Render a distinct `Preview` action for every order item and select the item directly from its render callback.

## 2. Read-Only Preview Modal

- [x] 2.1 Build the item preview with the existing shadcn Dialog primitives and show product, variant, SKU when present, quantity, and line subtotal.
- [x] 2.1a Show the purchase-time `previewImageUrl` before the textual item details, with no broken image when absent.
- [x] 2.1b Render customized items with the saved read-only customization preview and suppress the base thumbnail when that render is available.
- [x] 2.1c Ensure customization preview fullscreen escapes the lookup Dialog sizing constraints and fills the viewport.
- [x] 2.1d Keep read-only pointer events bubbling to the viewport so fullscreen canvas drag and pinch work.
- [x] 2.1e Prevent the parent lookup Dialog from closing while the customization preview is fullscreen.
- [x] 2.1f Suspend the parent Dialog overlay/content and modal behavior while fullscreen is active.
- [x] 2.1g Keep the lookup Dialog non-modal so the fullscreen portal receives pointer and focus events.
- [x] 2.2 Render only populated customization values and omit the customization section when no values remain.
- [x] 2.3 Add the explicit `Đóng` action and ensure standard Dialog dismissal clears the selected item without mutating lookup results.
- [x] 2.4 Keep the modal independent from current product navigation and exclude edit, reorder, cart, and internal snapshot actions.

## 3. Verification

- [x] 3.1 Add or update storefront tests covering per-item selection, repeated product lines, populated/empty customization rendering, and modal dismissal.
- [x] 3.2 Run `pnpm --filter router-cf test` and `pnpm --filter router-cf typecheck`.
- [x] 3.3 Run `pnpm --filter router-cf build` and record any unrelated repository baseline failures separately.
- [x] 3.4 Add backend contract coverage for purchase-time thumbnail output and legacy background snapshot fallback.
- [x] 3.5 Run backend test, check, and build verification plus storefront test, typecheck, and build verification.
