## Update: Product title requires Vietnamese only
- Changed backend publish validation so product title requires Vietnamese (`vi`) text only. Missing English (`en`) product title no longer blocks publish by itself.
- Confirmed product subtitle and product description remain optional localized fields and do not block publish by themselves.
- Updated `CONTEXT.md`, ADR `docs/adr/0006-bilingual-catalog-localization.md`, this change's design, tasks, and spec to document the field-specific requirement.
- Added unit coverage in `apps/backend/src/routes/admin/products.test.ts` for missing English title allowed and missing Vietnamese title rejected.
- Verification: `pnpm --filter backend exec vitest run --config vitest.config.ts src/routes/admin/products.test.ts`, `pnpm --filter backend check`, and `openspec validate bilingual-catalog-localization --strict` pass.

## Update: Returned both languages in API
- Migrated Storefront endpoints (products, collections, orders) to return full `LocalizedTextValue` (with both `vi` and `en`) instead of resolving on the backend.
- Created a storefront translation helper (`getLocalized`) to resolve strings to the user's selected locale on the client-side.
- Updated all product display components (Product Detail, Cart, Checkout, Order Confirmation) to use `getLocalized`.
- Verified type safety and test pass with `./init.sh`.


## Update: Removed sampleText multilingual (2026-08-25)

Sample text is admin-only canvas preview (shopper never sees it). Removed bilingual support entirely:
- `sampleText` type reverted to `string` in `@trophy/customization` types.
- Removed `sampleText` from `CustomizationTranslationWrite`, `prepareCustomizationTranslations`, `persistCustomizationTranslations`, and both hydration functions in `customization-translation.ts`.
- Removed `collectTextLayers`, `loadSampleTextTranslations` helper functions and unused `and`/`catalogTranslations`/`eq` imports.
- Inspector sample text field changed from `LocalizedTextField` to plain `Textarea`.
- Removed `resolveLocalizedInput` call in `text.ts` for sampleText default value.
- Removed dead sampleText publish gate in `validation.ts`.
- Updated storefront product test: removed sampleText translation row from mock queue, assertion now expects plain canonical string.
- Verification: backend 257 tests/check/build, admin `tsc -b` clean, `./init.sh` passes.

## Update: Editor UX fixes + missing template translations (2026-08-25)

- **Bug 1 — per-field independent VI/EN switches:** Made `locale`/`onLocaleChange` props optional on `LocalizedTextField` (defaults to internal `useState` when omitted). Removed shared locale states from `FormFieldLocalizedInputs`, `DraftNameField`, and Inspector sample text — each input now has its own independent switch.
- **Bug 2 — storefront not translating template sampleText/formFields:** `POST /templates` (template editor save) was never calling `persistCustomizationTranslations` — blocksJson stored raw `{vi,en}` objects with no rows in `catalog_translations`. Fixed by calling `persistCustomizationTranslations(db, stored)` before serializing, and `hydrateCustomization(db, result.stored)` in both GET routes (`/templates/product/:productId`, `/templates/:id`) so admin editor rehydrates both languages from the DB on reload.
- Verification: `pnpm --filter backend check`, `pnpm --filter backend test` (257 pass), `pnpm --filter admin exec tsc -b` clean, `./init.sh` passes.

## Update: Admin editor UX fixes (2026-08-25)

- Independent VI/EN switches: extracted `FormFieldLocalizedInputs` (own locale state per form-field row) and `DraftNameField` (own locale state per clipart upload draft); removed the shared panel-wide/queue-wide locale states that made all inputs switch together.
- Horizontal overflow in the 280px Form panel: added `min-w-0` to the localized field wrappers and each `LocalizedTextField` so the input+switch row can shrink; `overflow-x-hidden` on the left/right editor panels. Same `min-w-0` applied defensively to the Inspector sample text field (320px column).
- Fallback behavior confirmed unchanged: storefront resolves missing EN to the canonical VI text (`[locale] → vi → ""`); admin editor intentionally shows an empty EN tab with the orange missing-locale underline.
- Verification: `pnpm --filter admin exec tsc -b` clean, `pnpm --filter admin build` passes, full `./init.sh` passes.

Next Step: Archive change.

## Update: Customization and clipart shopper-facing text (2026-08-25)

Scope: localize every customization string the storefront actually renders — clipart category/asset names, form field label/placeholder/helpText, and text-layer sampleText. Color names, font family/preset names, and layer names stay canonical (not shopper-facing or deliberately out of scope).

Backend:
- `OwnerType` now includes `clipart_category` | `clipart_asset`; `customization-translation.ts` handles `sampleText` end to end.
- Admin clipart routes accept optional `nameTranslations` (canonical `name` = vi), batch `namesJson` rows are `{name, nameTranslations?}`, and all category/asset serializations return `nameTranslations` with fallback `{vi: name, en: ""}`. Covered by lib + route tests (257 backend tests).
- Storefront `GET /api/storefront/products/:handle?locale=` server-resolves the customization block: form labels/placeholders/help text, sampleText, and clipart names via `hydrateAndResolveTranslations`. Route tests cover en resolution and vi fallback.
- Publish validation rejects partial object `sampleText` (`LOCALIZATION_INCOMPLETE`) while string values pass.

Shared types / render sites:
- `@trophy/customization` adds `LocalizedTextInput`; `CustomizationFormField.label/helpText/placeholder` and `text.sampleText` are `string | LocalizedTextInput`. New `resolveLocalizedInput()` helper resolves for display (vi preferred).
- Fixed a silent hydration bug: `hydrateTranslations`/`hydrateAndResolveTranslations` now mutate items in place instead of returning copies callers discarded (affected product-reader and storefront hydrate paths).
- `customization-react` renders resolved strings; admin FormPanel/Inspector use `LocalizedTextField`; order summaries in backend `order-utils` resolve labels server-side.
- Cleaned pre-existing admin typecheck failures (dead PDF/raster export code in `customization-template-preview.tsx`, unused import in `product-content-route.ts`).

Verification: `pnpm --filter backend test` (40 files, 257 tests), `backend check`, `backend build`, `admin tsc -b` clean, `router-cf typecheck` clean, full `./init.sh` passes.

Next Step: Archive change.

## Progress

- All tasks are complete.
- Implemented catalog translation system (database schema, utils).
- Updated admin endpoints to process and persist localized fields.
- Updated storefront API to accept `locale` and resolve translations at runtime.
- Passed storefront locale through React Router loaders to API.
- Fixed order checkout, cart resolution, and snapshots to use localized fields.
- Fixed all typescript errors in backend and admin.
- ./init.sh verifies correctly.

Next Step: Archive change.
