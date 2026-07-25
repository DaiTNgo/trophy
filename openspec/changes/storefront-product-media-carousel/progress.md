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

## Next step

The change is fully implemented and verified. The next optional step is archiving the completed OpenSpec change.
