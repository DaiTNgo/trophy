# Product-Owned Customization Progress

## Current State

- All OpenSpec tasks for `product-owned-customization` are now implemented.
- Storefront product detail now consumes product-owned customization and ordered variant media directly from backend product reads.
- Storefront selected-variant state now drives the customization preview background, and shopper form state is preserved while switching between variants.
- Legacy storefront `/customize` template/revision routes were removed so the shopper path is product-owned only.

## Evidence

- `apps/storefront/app/routes/product.$handle.tsx` now loads dynamic fonts when customization is enabled, owns selected-variant state, and binds shopper customization form state to the selected variant preview.
- `apps/storefront/app/components/product/ProductCustomization.tsx` renders the shopper preview directly on the selected variant image and keeps the form free of any separate background picker.
- `apps/storefront/app/lib/product-customization.ts` centralizes storefront background-selection and value-merging logic for variant switching.
- `apps/backend/src/lib/storefront-product-customization.test.ts` verifies that selected-variant background selection changes preview media while layer geometry and shopper field values remain stable.
- `apps/storefront/app/routes.ts` no longer exposes legacy `/customize` or `/customize/:templateId` routes.
- `pnpm --filter customization test` passed.
- `pnpm --filter backend test -- --runInBand src/lib/storefront-product-customization.test.ts` passed.
- `pnpm --filter backend check` passed.
- `pnpm --filter backend build` passed.
- `pnpm --filter admin build` passed.
- `pnpm --filter router-cf typecheck` passed.
- `pnpm --filter router-cf build` passed.
- `openspec validate product-owned-customization --strict` passed.
- `./init.sh` passed.

## Next Step

- The change is ready to archive once review is complete.
