## Context

Trophy currently stores shopper-facing catalog text as single strings on catalog tables and customization JSON. Admin create-product now has early localized UI primitives, but those values are not persisted through backend route contracts. Storefront product and collection routes return Vietnamese-oriented strings and prices are already VND-only.

The domain glossary now distinguishes Storefront Locale, Default Catalog Locale, Localized Catalog Content, Catalog Translation Completeness, and Canonical Catalog Identity. ADR `0006-bilingual-catalog-localization` chooses language-neutral catalog records with attached Vietnamese and English localized content.

## Goals / Non-Goals

**Goals:**

- Persist Vietnamese and English values for all shopper-facing catalog content.
- Keep canonical catalog records language-neutral so translations do not alter product, option, option value, category, collection, variant, order, or customization identity.
- Keep pricing VND-only with no market/country pricing model.
- Migrate admin UI to reusable localized controls without requiring every layout to use the same label/input structure.
- Add route-level contract coverage for admin localized writes and storefront localized reads.
- Make publish readiness fail when required Vietnamese or English catalog content is missing.

**Non-Goals:**

- Adding more locales beyond `vi` and `en`.
- Adding market, country, exchange-rate, or multi-currency behavior.
- Translating internal-only admin labels, SKU, inventory, handles, media files, or variant IDs.
- Creating language-specific product URLs in this change.
- Adding external translation providers or machine translation.

## Decisions

### Use a shared catalog translations table

Add a shared translation table keyed by:

- `ownerType`: a narrow string such as `product`, `product_option`, `product_option_value`, `product_category`, `product_collection`, `product_attribute`, or `customization_form_field`.
- `ownerKey`: a text key for the owner. Numeric table rows use their database ID as text; nested customization labels use a stable compound key such as `product:<productId>:field:<fieldId>`.
- `fieldName`: the localized field, such as `title`, `subtitle`, `description`, `name`, `value`, `label`, `placeholder`, or `helpText`.
- `locale`: `vi` or `en`.
- `value`: localized text.

Use a unique index on `(ownerType, ownerKey, fieldName, locale)`.

Alternative considered: add `_vi` and `_en` columns to every table. This was rejected because the same localization behavior needs to cover many record types and nested customization labels. Alternative considered: JSON translation maps in every owning table. This was rejected because completeness checks and storefront hydration would become inconsistent.

### Keep existing text columns as Vietnamese canonical fallback during migration

Existing string columns remain during the first implementation pass and represent the Default Catalog Locale (`vi`) for compatibility with current admin/storefront code. New localized writes must keep the Vietnamese translation and existing canonical text column in sync. English lives in translation rows.

Alternative considered: remove canonical text columns immediately. This is too broad for a single change because many admin, storefront, order snapshot, search, and helper paths still read those fields directly.

### Route contracts expose localized objects to admin and localized strings to storefront

Admin route surfaces return editable localized objects for translatable fields, for example `{ vi: "...", en: "..." }`, because operators need to see completeness. Storefront route surfaces return strings resolved for the requested locale, because shopper UI should not handle translation maps.

Alternative considered: return maps to storefront and localize in React components. This was rejected because SSR loaders and backend route tests should own public response shape and fallback behavior.

### Storefront locale is explicit and limited

Storefront APIs accept `locale=vi|en`, default to `vi` when omitted, and reject unsupported locale values with typed validation errors. Route loaders can derive the query parameter from route state later, but the backend contract remains explicit.

Alternative considered: infer locale only from browser headers. This was rejected because operators and tests need deterministic URLs and route behavior.

### Publish completeness is field-specific

Draft saves can contain missing translations. Product title requires Vietnamese (`vi`) only; English (`en`) product title is optional. Product subtitle and product description are optional in both locales and do not block draft or publish. Other localized fields keep their own publish rules; for example, option and option value labels may still require both locales when they are shopper-facing selection labels. Admin UI should surface missing required fields near the localized controls and in product publish readiness.

Alternative considered: require English product title before publish. This was rejected because the current product authoring contract treats Vietnamese as the canonical required catalog locale and English as optional supporting content.

### Variant identity stays language-neutral

Variant generation, option selection, option-value deletion/reconciliation, cart lines, order item snapshots, customization geometry, and media relationships must use IDs and persisted relationships rather than translated labels. Translated option titles and values are display data only.

Alternative considered: continue using option/value text as the identity boundary. This is fragile because editing a translation could invalidate variant combinations.

## Risks / Trade-offs

- Existing code reads canonical text columns directly -> Mitigation: keep Vietnamese canonical columns during migration and add localized read helpers incrementally.
- Translation table can become a generic catch-all -> Mitigation: restrict `ownerType`, `fieldName`, and locale values in application validation and tests.
- Storefront search may need localized fields -> Mitigation: search `vi` canonical columns initially and add localized search clauses for requested locale as part of storefront route work.
- Nested customization labels need stable keys -> Mitigation: require stable form field/layer IDs before storing localized customization labels.
- Publish completeness can block existing draft/published products after migration -> Mitigation: route tests and admin checklist must make missing fields visible; dev mode allows cleaning current data instead of compatibility shims.

## Migration Plan

1. Add Drizzle schema for catalog translations and helper functions for upsert/list/hydrate by owner.
2. Seed or expose existing canonical strings as Vietnamese localized values during admin reads.
3. Update admin write routes to accept localized objects and sync the Vietnamese value back to canonical columns.
4. Update admin UI localized controls across product, option, option value, attribute, category, collection, and customization editor surfaces.
5. Update publish validation to require all required localized catalog content in `vi` and `en`.
6. Update storefront APIs to accept `locale=vi|en` and return resolved localized strings.
7. Add route-level contract tests and focused helper tests for completeness, fallback, and identity invariants.
8. Verify backend tests/check/build, admin build, storefront typecheck/build, OpenSpec validation, and `./init.sh`.

Rollback is straightforward while canonical Vietnamese columns remain: stop reading translation rows and keep existing Vietnamese strings. English content would be unavailable until the change is reapplied.

## Open Questions

None for this proposal. The working assumptions are: locales are exactly `vi` and `en`; Vietnamese is the default catalog locale; prices remain VND-only; product title requires `vi` only; product subtitle, product description, and product title `en` are optional; handles are shared across locales.
