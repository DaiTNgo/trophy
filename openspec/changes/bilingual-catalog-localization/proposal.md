## Why

Trophy needs Vietnamese and English storefront content without introducing separate products, variants, markets, or prices. Admin UI already has early localized-field experiments, but the database and route contracts still store shopper-facing catalog text as single strings, so translations cannot survive beyond a create/edit session.

## What Changes

- Add a bilingual catalog localization capability for `vi` and `en` catalog text.
- Keep prices VND-only and outside localization.
- Add backend persistence for localized catalog content while preserving language-neutral catalog identities.
- Update admin create/edit UI to use reusable localized controls for all shopper-facing catalog fields.
- Update admin route contracts to read/write localized values for products, options, option values, categories, collections, attributes, and shopper-facing customization labels.
- Update storefront route contracts to return localized catalog content for the requested storefront locale.
- Add completeness validation so required Vietnamese and English catalog content can be audited and enforced before publish.
- Preserve handles, variant generation, option selection, category links, order snapshots, media, inventory, and price behavior as canonical non-localized data.

## Capabilities

### New Capabilities

- `catalog-localization`: Bilingual Vietnamese/English catalog content persistence, admin editing, storefront locale resolution, and translation completeness behavior.

### Modified Capabilities

- None. No existing OpenSpec specs are present in `openspec/specs/`.

## Impact

- Backend D1/Drizzle schema for localized catalog content.
- Backend admin product, product metadata, customization, and storefront product/collection route surfaces.
- Admin product create/detail, category, collection, attribute, option, option value, and customization editor UI.
- Storefront loaders/components that display product, collection, category, option, attribute, and customization labels.
- Backend route-surface tests for admin localized writes and storefront localized reads.
- Admin and storefront type definitions for localized input/output models.
