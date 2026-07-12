The requirement to return both languages from the API has been fulfilled and verified. UI consumes the returned `LocalizedTextValue` safely via `getLocalized` helper.


## Session Update: Product Field Requirements

Backend and docs now define product-localized requirements as field-specific: product title requires Vietnamese (`vi`) only; product title English (`en`), subtitle, and description are optional and do not block publish by themselves. Updated `CONTEXT.md`, ADR `docs/adr/0006-bilingual-catalog-localization.md`, and this change's `design.md`, `tasks.md`, and `specs/catalog-localization/spec.md`. Added unit coverage in `apps/backend/src/routes/admin/products.test.ts`.

Verification passes:
- `pnpm --filter backend exec vitest run --config vitest.config.ts src/routes/admin/products.test.ts`
- `pnpm --filter backend check`
- `openspec validate bilingual-catalog-localization --strict`

Note: Broad `pnpm --filter backend test -- products.test.ts` also matches `products.route.test.ts`, whose existing query-chain mock failures are unrelated to this field requirement update.

## Session Handoff

The `bilingual-catalog-localization` change has been fully implemented, tested, and `./init.sh` passes cleanly. Ready for `openspec-archive-change`.
