# Progress

- Proposal, design, specification, and implementation task artifacts are complete.
- `openspec validate storefront-product-media-carousel --strict` passes.
- Storefront carousel and customization form interaction reset are implemented.
- Tests cover media ordering/deduplication and interaction callback delivery.
- `pnpm --filter router-cf test -- app/lib/product-customization.test.ts` passes: 5 files, 22 tests.
- `pnpm --filter @trophy/customization-react check` passes.
- `pnpm --filter router-cf exec tsc -b` passes.
- `pnpm --filter router-cf build` completes successfully; Wrangler emits a non-fatal local EPERM while writing its external debug log.
- Confirmed decisions: one selected-variant carousel with Customization Media first; Gallery Media follows by position; looped Previous/Next; variant changes reset to customization media; form focus/click resets the visible image while preserving values; storefront owns carousel state and `@trophy/customization-react` exposes only an interaction callback.
- Follow-up fix: storefront listing consumes the admin-managed product-level media collection, using its first positioned item as the listing thumbnail. PDP/product-detail imagery remains variant-owned only, with product-level media excluded from the detail read model and carousel. Added a regression assertion for listing thumbnail precedence; `pnpm --filter backend test -- src/routes/storefront/products.test.ts` passes with 111 tests.
- Follow-up fix (2026-07-26): the PDP now keeps the customization preview mounted in the fixed media stage while Gallery Media is visible. Switching roles only changes the visible layer, avoiding the preview's mount-time canvas measurement/fit work and the resulting gallery jump. The desktop stage no longer nests two fixed-height frames. `pnpm --filter router-cf test -- app/lib/product-customization.test.ts` passes (5 files, 22 tests), as do `pnpm --filter router-cf run typecheck`, `pnpm --filter router-cf run build`, and `git diff --check`. `./init.sh` remains blocked before storefront verification by the existing backend test-fixture diagnostics in `apps/backend/src/lib/storefront-product-customization.test.ts` where four `StorefrontVariantMedia` literals omit required `id`.

## Next step

The change is fully implemented and verified. The next optional step is archiving the completed OpenSpec change.

## Follow-up refactor (2026-07-26)

- Split the category PDP route into a thin route surface, `use-product-detail-state.ts` for state/effects/cart/carousel orchestration, and focused product layout, option-group, and customization-purchase components. The existing carousel behavior and state ownership remain in storefront.
- `pnpm --filter router-cf typecheck`, `pnpm --filter router-cf build`, and `git diff --check` pass. No storefront `.tsx` files remain above 500 lines.
