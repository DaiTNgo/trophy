## 1. Data Model And Helpers

- [x] 1.1 Add Drizzle schema for a shared catalog translations table with `ownerType`, `ownerKey`, `fieldName`, `locale`, `value`, timestamps, and a unique owner/field/locale index.
- [x] 1.2 Define backend locale constants and validation helpers for exactly `vi` and `en`.
- [x] 1.3 Implement translation upsert/list/hydration helpers that can read and write localized values for table-backed records and stable nested customization owner keys.
- [x] 1.4 Add helper tests for locale validation, Vietnamese canonical fallback, translation hydration, and duplicate owner/field/locale behavior.

## 2. Backend Admin Contracts

- [x] 2.1 Update admin product full-create/detail/update route contracts to accept and return localized product title, subtitle, and description.
- [x] 2.2 Update admin product option and option value route contracts to accept and return localized option titles and option value labels while preserving option/value IDs.
- [x] 2.3 Update admin category and collection route contracts to accept and return localized names/titles and descriptions where shopper-facing.
- [x] 2.4 Update admin product attribute route contracts to accept and return localized attribute names and values when attributes are storefront-visible.
- [x] 2.5 Update product-owned customization route contracts to persist localized shopper-facing form labels, placeholders, help text, and choice labels without changing geometry or layer identity.
- [ ] 2.6 Keep Vietnamese localized writes synced to existing canonical text columns for compatibility during the migration.

## 3. Publish Completeness

- [x] 3.1 Define required localized fields for products, options, option values, categories, collections, storefront-visible attributes, and customization labels.
- [x] 3.2 Add backend completeness checks that allow draft saves but block publish when required `vi` or `en` content is missing.
- [x] 3.3 Return typed publish validation errors that identify localized catalog content as incomplete.
- [x] 3.4 Surface translation completeness in admin product publish readiness/checklist UI.

## 4. Admin UI Migration

- [x] 4.1 Refactor localized UI primitives so language switch controls can be embedded inside input groups and reused without forcing label/column layout.
- [x] 4.2 Migrate create product general fields to localized controls for title, subtitle, and description.
- [x] 4.3 Migrate create product option titles to localized controls and option value rows/badges to inline Vietnamese/English editing.
- [x] 4.4 Migrate product detail overview/options/attributes/customization sections to read and write localized values.
- [x] 4.5 Migrate category and collection create/detail modals/pages to localized controls for shopper-facing fields.
- [x] 4.6 Ensure SKU, inventory, VND prices, handles, media, variant identity, and customization geometry remain single canonical controls.

## 5. Storefront Localization

- [x] 5.1 Update storefront product listing/detail APIs to validate `locale=vi|en`, default to `vi`, and return resolved localized strings.
- [x] 5.2 Update storefront collection/category product APIs to return localized collection/category display text for the requested locale.
- [x] 5.3 Update storefront loaders to pass the active storefront locale to backend route calls.
- [x] 5.4 Update storefront components to render localized product, option, option value, attribute, category, collection, and customization text from the API response.
- [ ] 5.5 Verify VND price amounts and currency code do not vary between `vi` and `en` responses.

## 6. Order Snapshot Localization

- [ ] 6.1 Include storefront locale in cart resolution and checkout/order creation flow where localized display text is needed.
- [x] 6.2 Snapshot localized product, variant, option, and customization display labels in order items while preserving canonical product and variant IDs.
- [ ] 6.3 Add order route tests proving localized labels are frozen when catalog translations change later.

## 7. Tests

- [x] 7.1 Add admin route-surface tests for localized product create/read/update behavior.
- [x] 7.2 Add admin route-surface tests for localized option and option value edits preserving variant identity.
- [x] 7.3 Add admin route-surface tests for category, collection, attribute, and customization localized writes.
- [x] 7.4 Add publish route tests for missing Vietnamese and missing English localized content.
- [x] 7.5 Add storefront route tests for `locale=vi`, `locale=en`, unsupported locale rejection, localized response shape, and VND price invariance.
- [x] 7.6 Add admin UI tests for localized create-product option title/value editing where feasible.

## 8. Documentation And Verification

- [x] 8.1 Update this change's `progress.md` with implementation evidence and any intentionally deferred surfaces.
- [x] 8.2 Update this change's `session-handoff.md` with restart notes.
- [x] 8.3 Run `pnpm --filter backend test`, `pnpm --filter backend check`, and `pnpm --filter backend build`.
- [x] 8.4 Run `pnpm --filter admin build`.
- [x] 8.5 Run `pnpm --filter router-cf typecheck` and `pnpm --filter router-cf build`.
- [x] 8.6 Run `openspec validate bilingual-catalog-localization --strict`.
- [x] 8.7 Run `./init.sh` before marking the change complete.
