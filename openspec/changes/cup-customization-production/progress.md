# Progress

- 2026-08-18: Fixed Product Detail's Open editor `Add Polygon` action to create the same centered six-sided vector image shape as Create Product. It had incorrectly entered the freeform draw state after the Draw Shape control was removed.
- Verification: `git diff --check` passes. `pnpm --filter admin build` is blocked by pre-existing unused Preview Export symbols in `customization-template-preview.tsx`; the compiler reports no error in the changed hook.
- 2026-08-18: Added admin Preview image export using a data-driven SVG renderer rasterized into a detached canvas. WebP is the default request and PNG is selectable/fallback according to the encoder result. The renderer embeds export assets and fonts as data URLs before canvas encoding, and preserves layer ordering, image crop/rotation, and built-in/vector clip paths.
- 2026-08-18: Added the same WebP/PNG export actions to Admin Order Detail's frozen customization Preview modal. It rebuilds the design only from the order snapshot and names the download with order/item identifiers.
- Verification: `pnpm --filter admin test -- raster-export.test.ts` passed (7 files, 23 tests). `pnpm --filter admin build` remains blocked by an unrelated in-progress customization-panel change: `apps/admin/src/components/customization/customization-template-panels-feature.tsx(89,10)` does not supply required `onDrawShape`.
