## Context

The current customization artwork work uses icon-oriented naming and behavior that no longer matches the product model. The intended domain is a Customization-owned clipart library: admins create clipart categories, upload media into those categories, and configure product customization layers to allow shoppers to choose from a curated subset of a selected clipart category.

The repo is in dev mode, so this change should replace the icon asset model instead of preserving compatibility paths. Admin IA also changes at the same time: Customization becomes the parent area for Templates, Clipart, and Brand Assets. Brand Assets remains only for colors and fonts.

## Goals / Non-Goals

**Goals:**

- Replace icon asset vocabulary, routes, types, validation, and UI with clipart category/media vocabulary.
- Make `Clipart Category` a lightweight grouping entity with only admin-authored `name` plus system fields.
- Make `Clipart Asset` a media record under exactly one clipart category, with a readonly original filename and an editable display name.
- Remove tags, slug, description, and fixed single-asset clipart behavior.
- Require product clipart layers to reference one clipart category, a layer allowlist, and a default media asset.
- Keep shopper choice simple: shoppers pick media from the admin-selected category/allowlist, never from all categories.
- Preserve existing order reproducibility through snapshots without storing filename or category name.

**Non-Goals:**

- No legacy admin redirects from the previous Brand Assets icon route.
- No migration compatibility layer for old icon asset table/API/type names.
- No tag search/filtering for clipart assets.
- No shopper category picker.
- No remote marketplace, public clipart discovery, or cross-category asset reuse.

## Decisions

### Customization Owns Clipart IA

Admin navigation will expose `Customization > Templates`, `Customization > Clipart`, and `Customization > Brand Assets`. Product customization routes move directly to `/customization/templates`, clipart management to `/customization/clipart`, and colors/fonts to `/customization/brand-assets`.

Alternative considered: keep Brand Assets as the parent and add Clipart as a tab. This keeps the old implementation shape but hides the product customization relationship. The chosen route structure matches the domain: clipart is one input source for customization layers.

### Clipart Categories Are Lightweight

The category model stores `id`, `name`, `active`, `sortOrder`, and timestamps. It intentionally does not include slug or description. Categories are admin grouping labels used to constrain layer choices and organize uploaded media.

Alternative considered: add slug/description for future publishing or SEO. That adds fields with no current business use and creates unnecessary authoring work.

### Clipart Assets Belong To One Category

Each asset stores `categoryId`, `sourceAssetId`, editable `name`, readonly `fileName`, media URL/reference fields, MIME type, dimensions, active state, and timestamps. Supported upload media are SVG, PNG, and WebP. Tags are removed.

Alternative considered: many-to-many categories or tags. The user workflow requires one category per asset, and product layers curate the subset they need through a layer allowlist.

### Batch Upload Uses A Review Step

Admins select a category and one or more files. Before committing, the UI shows a thumbnail, readonly filename, and editable display name prefilled from the filename. Batch commit is all-or-nothing: unsupported file type, missing name, invalid category, or duplicate file within the same batch blocks the whole batch.

Alternative considered: partial success uploads. That creates cleanup and retry ambiguity for admins. All-or-nothing keeps the library state predictable.

### Source Policies Are Clipart Category Or Upload

The shared customization source policy enum keeps `upload_only`, `clipart_category_only`, and `upload_or_clipart_category`. It removes `fixed_clipart`. For `upload_or_clipart_category`, the default source is always clipart, while `source_select` and `side_by_side` presentations remain available.

Alternative considered: keep `fixed_clipart` as a hidden single asset source. The user explicitly removed that use case; a layer that needs curated media should use an allowlist with one default and one or more allowed assets.

### Layer Allowlists Are The Shopper Boundary

For `clipart_category_only` and `upload_or_clipart_category`, the admin selects a fixed clipart category, a layer clipart allowlist from that category, and a default asset in the allowlist. Publish readiness fails if the category, allowlist assets, or default asset are inactive, missing, or inconsistent.

Alternative considered: let shoppers pick category first. That exposes library organization as product behavior and makes each product harder to control. The chosen design keeps product intent under admin control.

### Snapshots Store Display Identity, Not Library Admin Metadata

Order/cart snapshots for clipart choices store `clipartAssetId`, `clipartAssetName`, `categoryId`, `sourceAssetId`, media URL/reference, MIME type, dimensions, and rendered layer context/design data. They do not store filename or category name.

Alternative considered: store all category and file metadata. Filename is an admin upload detail, and category name is only an authoring label. Snapshotting the display name and media identity is enough to reproduce and explain the shopper-selected design.

## Risks / Trade-offs

- Icon-to-clipart renaming touches backend, admin, storefront, and shared package contracts -> keep the change scoped to the active customization feature and remove old paths in one pass.
- All-or-nothing batch upload can reject a large batch for one bad file -> show per-file validation errors in the review step before commit.
- Duplicate display names are allowed, which can make admin lists ambiguous -> show filename in admin-only review/list surfaces and use thumbnails to disambiguate.
- Deactivated assets remain needed for historical orders -> runtime queries must exclude inactive assets for new choices while snapshot rendering reads stored order media/context.

## Migration Plan

1. Replace schema, service, route, and type names from icon assets to clipart categories/assets.
2. Remove old icon routes and admin navigation entries instead of redirecting.
3. Rename shared source policies and remove `fixed_clipart` from validators/builders.
4. Update admin customization UI paths and layer inspectors.
5. Update storefront runtime serialization and choice controls.
6. Update cart/order snapshot capture and display.
7. Run package tests/builds and root `./init.sh`.

Rollback is not planned as a compatibility feature because this repo is in dev mode. If the change fails during implementation, revert the unfinished change set before shipping.

## Open Questions

- None. Current requirements are considered settled by the conversation and ADR 0007.
