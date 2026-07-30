# Progress

## Current State

- Updated storefront navigation labels on 2026-07-30: English uses “Shop by Products” and “Shop by Interest”; Vietnamese uses the shorter “Danh mục” and “Theo nhu cầu” in both desktop and mobile menus.
- Raised the shared storefront dialog and drawer layers to `z-[100]` on 2026-07-30. The mobile PDP sticky preview shell uses `z-[70]`, so search and sidebar overlays must sit above it when opened.
- Adjusted the mobile customization preview canvas on 2026-07-29 to use `clamp(240px, 42svh, 380px)`. Its caller now explicitly removes the shared component's desktop `min-height: 520px` on mobile; otherwise the smaller mobile shell clipped the toolbar at the bottom of the internally taller canvas. The existing `lg` desktop dimensions remain unchanged.
- Implemented the storefront side of `mobile-pdp-preview-sticky-shell` on 2026-07-16.
- `apps/storefront/app/components/layout/storefront-layout.tsx` now derives a route-aware `hideCategoryStripOnMobile` flag for product detail pages and passes it into `Navbar`.
- `apps/storefront/app/components/layout/Navbar.tsx` now suppresses the category strip on product detail pages for mobile/tablet widths and disables mobile navbar sticky behavior on PDP while preserving the existing desktop strip/sticky behavior.
- `apps/storefront/app/components/product/ProductGallery.tsx` now uses a larger desktop sticky top offset so the desktop navbar/category strip do not overlap the preview panel while the form column continues to scroll.
- `apps/storefront/app/routes/product.$handle.tsx` now has a dedicated customizable-product mobile branch with:
  - a sticky preview shell above the navbar at `top-0`,
  - constrained preview height,
  - `Hide preview` / `Show preview` state that only appears once the shell is sticky,
  - hidden preview state persisting while the shopper scrolls upward and auto-resetting only at page top,
  - reserved shell height while hidden so hiding the preview does not jump the shopper's scroll position,
  - route-level sticky activation via `IntersectionObserver`,
  - a shared preview anchor for the existing `Preview` CTA,
  - non-customizable products continuing through the previous gallery/info layout.
- `apps/storefront/app/components/product/ProductGallery.tsx` now exports a reusable thumbnail strip so the mobile preview shell can reuse storefront gallery thumbnails without copying that UI logic.
- `packages/customization-react/src/index.tsx` now supports:
  - optional `className` for caller-controlled container sizing,
  - a fullscreen preview action,
  - fullscreen overlay viewing with preserved preview state,
  - read-only compatibility preserved through the existing read-only control gating.

## Verification

- `pnpm --filter @trophy/customization-react check` passed.
- `pnpm --filter router-cf typecheck` passed after the ref type correction in `product.$handle.tsx`. Wrangler still emitted the known sandbox-related log-file EPERM warning under `~/Library/Preferences/.wrangler/logs`, but `tsc -b` completed successfully.
- `pnpm --filter router-cf build` passed.
- `pnpm --filter admin build` passed.

## Remaining Work

- Manual mobile verification is still pending.
- `tasks.md` remains at 10/11 complete because task `3.1` requires visually checking the mobile PDP behavior in a running local preview.

## Blockers

- Local preview verification is currently blocked by environment/runtime issues:
  - sandbox and Wrangler log writing constraints,
  - preview startup conflicts with ports already in use,
  - no reliable browser session was available in this run to inspect the mobile PDP visually.
