## 1. Helper

- [x] 1.1 Create `apps/admin/src/lib/media-asset.ts` with `isPdfFile`, `toPreviewImageFile`, `readMediaAsset`, `dimensionsMatch`
- [x] 1.2 Make `readMediaAsset` throw "Failed to load media dimensions." and return non-nullable `dimensions`
- [x] 1.3 Add `apps/admin/src/lib/media-asset.test.ts`: PDF → preview + original-file dimensions; image → no preview; unreadable → throws; `dimensionsMatch` match / mismatch / null

## 2. Call sites

- [x] 2.1 Migrate `use-create-product.ts` (gallery + customization media)
- [x] 2.2 Migrate `use-product-detail-variants.ts`
- [x] 2.3 Migrate `product-detail-customization.tsx` `stageFile`
- [x] 2.4 Migrate `variant-media-manager.tsx`
- [x] 2.5 Remove remaining `null` / `?? 0` / `.catch` fallbacks in 2.1–2.4 and surface the rejection error to the operator

## 3. Docs & verification

- [x] 3.1 Record rejection rule in `CONTEXT.md` (Background Size Contract)
- [x] 3.2 Run `pnpm --filter admin exec tsc -b` and admin tests; update `progress.md` / `session-handoff.md` in this change folder
