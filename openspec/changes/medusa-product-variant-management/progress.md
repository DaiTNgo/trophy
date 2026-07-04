# Progress

## Current State

- Proposed OpenSpec change `medusa-product-variant-management` on 2026-07-04.
- Captured the decision to follow Medusa-like product detail behavior while keeping Trophy's product model.
- Captured the rule that the admin product detail edit UI must not use full-replace options or variants APIs for routine option, variant, price, stock, or media actions.
- Added proposal, design, specs, and tasks for implementation.
- Implemented operation-specific backend product-detail routes for option definitions/values, variant details, prices, stock, and variant media in `apps/backend/src/routes/admin/products.ts`.
- Added persisted `inventoryQuantity` and `allowBackorder` fields to the backend variant schema and threaded them through backend/admin product mapping.
- Replaced the admin product-detail variants UI with a Medusa-style split management surface in `apps/admin/src/pages/product-detail/product-detail-variants.tsx`.
- Added operation-specific admin client methods and documented the legacy full-replace methods/routes as non-product-detail paths.
- Added route-level contract coverage for the new product-detail endpoints in `apps/backend/src/routes/admin/products.route.test.ts`.

## Evidence

- Research note: `docs/research/2026-07-04-medusa-admin-product-variants-pricing-edit-ui-gap.md`.
- Supporting research note: `docs/research/2026-07-04-medusa-admin-product-create-vs-detail-ui-patterns.md`.
- Domain glossary updated in `CONTEXT.md`.
- Verification completed this session:
  - `pnpm --filter backend test`
  - `pnpm --filter backend check`
  - `pnpm --filter backend build`
  - `pnpm --filter admin build`
  - `./init.sh`

## Next Step

- Re-run `openspec validate medusa-product-variant-management --strict` after final state-file updates, then archive the change when ready.

## Risks

- Existing full-replace backend routes may still have other callers. Implementation must isolate the new product detail edit path before removing or narrowing legacy routes.
- Existing full-replace backend routes are still present for legacy/create callers, so follow-up cleanup should remove or narrow them once no callers remain.
