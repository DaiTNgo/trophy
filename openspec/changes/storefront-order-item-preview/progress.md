# Progress

## Completed

- Added a per-order-item `Preview` action to the storefront order lookup cards.
- Added a controlled shadcn Dialog that renders the selected item's shopper-safe snapshot fields.
- Added purchase-time thumbnail snapshot output as `previewImageUrl` and rendered it at the top of the modal.
- Added sanitized customization snapshot output and reused `ProductCustomizationPreview` for customized items.
- Fixed fullscreen preview sizing so route-provided modal dimensions cannot override the viewport-sized fullscreen state.
- Fixed read-only pointer event handling so fullscreen canvas drag/pinch is captured by the viewport.
- Confirmed fullscreen backdrop is non-dismissable; only the `X` control closes fullscreen.
- Prevented Radix Dialog outside interactions from closing the lookup modal while the fullscreen customization portal is active.
- Suspended the parent Dialog overlay, focus behavior, and visible content while fullscreen is active to avoid overlapping modal layers.
- Set the lookup Dialog to non-modal so fullscreen portal drag and `X` interactions are not blocked by Radix's outside pointer guard.
- Kept repeated product lines independent by selecting the item directly from the rendered list.
- Omitted empty SKU and customization values; omitted the customization section when empty.
- Added the explicit `Đóng` action and standard Dialog dismissal behavior without order mutations.
- Added helper tests for repeated-line selection and empty customization filtering.

## Verification

- `pnpm --filter router-cf test` passed: 4 files, 19 tests.
- `pnpm --filter router-cf typecheck` passed.
- `pnpm --filter router-cf build` passed for client and SSR bundles.
- Storefront customization preview build path passed with the existing `ProductCustomizationPreview` component.
- `pnpm --filter backend test` passed: 21 files, 108 tests.
- `pnpm --filter backend check` passed.
- `pnpm --filter backend build` passed.
- `git diff --check` passed.

## Scope Notes

- The lookup contract now includes shopper-safe `previewImageUrl`; old orders fall back to their persisted background snapshot.
- Customized items render saved values/template data; raw rendered design JSON remains excluded.
- The storefront test harness currently runs in Node without a DOM testing library, so interaction coverage is represented by pure selection/filter helper tests; the Dialog behavior is typechecked and build-verified.
