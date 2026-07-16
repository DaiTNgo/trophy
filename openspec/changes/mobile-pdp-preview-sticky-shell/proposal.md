## Why

The mobile product detail page currently spends too much vertical space on storefront chrome before shoppers can work with the product preview and customization controls. Once shoppers scroll into the customization form, they also lose quick access to the live preview, which makes mobile customization slower and harder to reason about.

## What Changes

- Add a mobile-only sticky preview shell on the storefront product detail page so the preview remains accessible while shoppers scroll through customization controls.
- Add storefront-managed `Show preview` / `Hide preview` behavior on mobile instead of keeping the preview permanently inline.
- Remove the mobile category strip from the storefront navbar on the product detail page so the PDP reserves more space for the product and customization flow.
- Add a fullscreen preview action to `@trophy/customization-react` so shoppers can inspect the preview in an overlay without making the storefront mobile shell itself full-screen.

## Capabilities

### New Capabilities
- `storefront-mobile-pdp-preview`: Mobile storefront product detail layout that can hide the category strip, pin the preview below the navbar, and toggle preview visibility with a sticky show/hide bar.
- `customization-preview-fullscreen`: Shared customization preview fullscreen overlay behavior for storefront and other preview consumers that support viewing the design larger than its inline container.

### Modified Capabilities

## Impact

- Affected code:
  - `apps/storefront/app/routes/product.$handle.tsx`
  - `apps/storefront/app/components/layout/Navbar.tsx`
  - `packages/customization-react/src/index.tsx`
- Affected UX:
  - mobile shopper product detail customization flow
  - shared preview interaction surface
- Verification impact:
  - `pnpm --filter router-cf typecheck`
  - `pnpm --filter router-cf build`
  - `pnpm --filter @trophy/customization-react check`
  - `pnpm --filter admin build` if shared fullscreen changes affect admin preview consumers
