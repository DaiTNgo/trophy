## 1. Shared Model And Helpers

- [x] 1.1 Extend the shared text path contract with a closed ellipse path type containing normalized bounds, start angle, direction, and side/orientation.
- [x] 1.2 Update shared validation so closed ellipse Text on path layers require max lines to equal `1`.
- [x] 1.3 Add shared SVG path generation for closed ellipse paths with deterministic start point and direction.
- [x] 1.4 Update shared text fitting helpers so closed path text fits against path length, shrinks to the configured minimum font size, and silently trims overflow.
- [x] 1.5 Add shared tests for closed ellipse path validation, SVG path generation, one-line enforcement, alignment anchoring, and fit-then-trim behavior.

## 2. Admin Authoring

- [x] 2.1 Add a `Text on path` creation action to the Blocks panel alongside `Text` and `Image Shapes`.
- [x] 2.2 Create Text on path layers centered on the canvas with a closed ellipse path, linked form field, top stack order, selected state, and path-edit state enabled.
- [x] 2.3 Update the Text inspector so Text on path layers lock max lines to `1` and expose closed path controls without open arc or Pen mode controls.
- [x] 2.4 Render selected Text on path layers with an ellipse outline, resize handles, and a start-position handle on the admin canvas.
- [x] 2.5 Implement canvas interactions for moving the whole Text on path layer, resizing the ellipse bounds, dragging the start-position handle, and flipping orientation from the inspector.
- [x] 2.6 Ensure Text on path canvas text remains preview-only and cannot be edited or text-selected directly on the canvas.

## 3. Runtime Rendering Parity

- [x] 3.1 Update admin Preview rendering to render closed ellipse Text on path layers with path-aware alignment and fit-then-trim behavior.
- [x] 3.2 Update storefront rendering to render published closed ellipse Text on path layers and enforce one-line shopper input.
- [x] 3.3 Update backend validation/export rendering to support closed ellipse Text on path layers and hidden-layer exclusion.
- [x] 3.4 Confirm existing straight text and Image Shape behavior remains unchanged.

## 4. Verification

- [x] 4.1 Run `pnpm --filter @trophy/customization test`.
- [x] 4.2 Run `pnpm --filter @trophy/customization check`.
- [x] 4.3 Run `pnpm --filter admin build`.
- [x] 4.4 Run `pnpm --filter router-cf typecheck` and `pnpm --filter router-cf build`.
- [x] 4.5 Run `pnpm --filter backend check` and `pnpm --filter backend build`.
- [x] 4.6 Run `openspec validate customization-text-on-closed-path --strict`.
- [x] 4.7 Run `./init.sh`.
