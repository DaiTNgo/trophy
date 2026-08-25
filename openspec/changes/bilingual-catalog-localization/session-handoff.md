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

## Session Update: Customization And Clipart Localization (2026-08-25)

Implemented the customization-scope localization (tasks 9.1–9.7): clipart category/asset `nameTranslations`, form field label/placeholder/helpText objects, and text-layer `sampleText` objects, all persisted raw in the customization JSON / `catalog_translations` and server-resolved for the storefront per `?locale=`. Admin edits them via `LocalizedTextField`; publish blocks partial `{vi,en}` sampleText.

Key facts for the next session:
- Canonical contract: admin sends `{name: viTrim, nameTranslations: {vi, en}}` (clipart) or writes `{vi,en}` objects directly into form fields/sampleText; storefront always receives resolved plain strings.
- `hydrateTranslations` mutates items in place now — do not reintroduce copy-return semantics.
- Mock-DB test pattern: awaited `.then()` queries shift the shared select queue; `.get()`/`.returning()` do not.
- Full verification green: backend 257 tests/check/build, admin + storefront typechecks, `./init.sh`.

Ready for `openspec-archive-change` when the user confirms.

## Session Update: Editor UX Fixes (2026-08-25)

Post-testing fixes, admin-only: per-field independent VI/EN switches (`FormFieldLocalizedInputs`, `DraftNameField` sub-components with local locale state) and horizontal overflow fixes in the 280px Form panel (`min-w-0` chain + `overflow-x-hidden` on both editor panels). Storefront fallback behavior intentionally unchanged (missing EN → canonical VI). `tsc -b`, `admin build`, and `./init.sh` all pass.

## Session Update: Per-field independent switches + template translations (2026-08-25)

Two issues reported after first round of fixes, both now resolved:

1. **Per-field switch still shared:** `locale`/`onLocaleChange` props on `LocalizedTextField` were required, so every usage passed them. Made them optional — when omitted, the component manages its own locale via internal `useState`. Removed shared locale states from `FormFieldLocalizedInputs` (3 inputs per field card), `DraftNameField`, and Inspector sample text. Each input now has its own independent VI/EN switch.

2. **Storefront sampleText/formFields not translating for template editor flow:** `POST /templates` (standalone template editor save) was never calling `persistCustomizationTranslations` — blocksJson stored raw `{vi,en}` objects with no rows in `catalog_translations`. Storefront `hydrateAndResolveCustomization` then fell back to casting the raw object as string → rendered `[object Object]`. Fixed by:
   - `POST /templates`: call `persistCustomizationTranslations(db, stored)` before `serializeEditorModel` — writes translation rows, mutates `stored` to plain vi strings (matching product-command-route contract).
   - `GET /templates/product/:productId` and `GET /templates/:id`: call `hydrateCustomization(db, result.stored)` after `readTemplateRevision` — reloads both languages from DB so admin editor shows both tabs correctly on reload.

Verification: `pnpm --filter backend check`, `pnpm --filter backend test` (257 pass), `pnpm --filter admin exec tsc -b` clean, `./init.sh` passes.

## Session Update: Removed sampleText multilingual (2026-08-25)

Removed bilingual input for sample text (admin-only canvas preview, shopper never sees it). `sampleText` is now a plain `string` everywhere — type reverted in `@trophy/customization`, translation persistence/hydration removed from `customization-translation.ts`, inspector uses plain `Textarea`, dead publish gate removed from `validation.ts`, `resolveLocalizedInput` call removed from `text.ts`. Backend 257 tests pass, admin typecheck clean, `./init.sh` passes.
