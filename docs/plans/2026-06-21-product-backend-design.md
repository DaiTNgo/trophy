# Product Backend Design

Date: 2026-06-21
Scope: ecommerce backend product domain for `apps/backend`
Status: approved for planning

## Summary

This design defines a Medusa-like product model for the backend. A product owns content and organization metadata. A variant is the sellable unit and always exists. When variants are disabled in admin, the system still creates a single default variant so price and later inventory stay on the same data model.

Customize is explicitly out of scope for this phase. The model should leave room for a future customization module without forcing a redesign of `product` or `variant`.

## Goals

- Model product detail fields close to Medusa behavior.
- Keep taxonomy and variant structure normalized for future filtering and storefront use.
- Store price on variants only.
- Support admin workflows for products with and without variants.
- Leave a clean extension point for future product customization.

## Non-Goals

- Product customization implementation.
- Inventory, stock reservations, or fulfillment.
- Multi-currency pricing, price lists, or compare-at pricing.
- Media upload pipeline implementation.

## Requirements

### Product Detail

- `title` is required.
- `subtitle` is optional.
- `handle` is optional in admin input.
- If `handle` is missing on create, backend generates it from `title`.
- Stored `handle` remains unique.
- `description` is optional.
- `media` is optional.
- `attributes` are optional.

### Organize

- `type` is optional and single-select.
- `collection` is optional and single-select.
- `categories` are optional and multi-select.
- `tags` are optional and multi-select.

### Variants

- Every product must have at least one variant.
- If variants are disabled, the product owns exactly one default variant.
- If variants are enabled, variants are defined by option values such as `Size` and `Color`.
- Price is stored on each variant.

### Attributes

- Attributes are separate from variant options.
- Attributes describe the product, for example `width`, `height`, or `weight`.
- Attributes do not generate sellable variants.

## Recommended Approach

Use a normalized Medusa-like relational model.

Why this approach:

- It matches the requested admin behavior.
- It keeps variant pricing and later inventory on one consistent shape.
- It avoids JSON-heavy modeling that becomes painful for filtering and validation.
- It leaves room for future customization tables that attach to `products` without disturbing pricing or variant logic.

Alternatives considered:

1. Hybrid relational plus JSON for options and attributes.
   Faster to scaffold but weaker for validation and future storefront filters.
2. Document-first JSON model.
   Fastest initial CRUD but poor long-term fit for commerce data.

## Domain Model

### Product

Owns editorial content and organization metadata:

- title
- subtitle
- handle
- description
- status
- type
- collection
- categories
- tags
- media
- attributes
- has_variants flag

### Variant

The sellable unit:

- always exists
- owns price
- may later own SKU, inventory, barcode, weight, and fulfillment data

### Option and Option Value

Used only for variant generation:

- option examples: `Size`, `Color`
- value examples: `M`, `Red`

### Attribute

Descriptive data only:

- examples: `width`, `height`, `weight`, `material`

## Data Model

### Core Tables

`products`
- `id`
- `title` not null
- `subtitle` nullable
- `handle` not null after persistence, unique
- `description` nullable
- `status` enum-like text, default `draft`
- `has_variants` boolean
- `type_id` nullable
- `collection_id` nullable
- `created_at`
- `updated_at`

`product_variants`
- `id`
- `product_id`
- `title`
- `sku` nullable in phase one
- `price_amount` integer
- `is_default` boolean
- `position`
- `created_at`
- `updated_at`

`product_options`
- `id`
- `product_id`
- `title`
- `position`

`product_option_values`
- `id`
- `option_id`
- `value`
- `position`

`product_variant_option_values`
- `variant_id`
- `option_value_id`

`product_attributes`
- `id`
- `product_id`
- `name`
- `value`
- `unit` nullable
- `position`

`product_media`
- `id`
- `product_id`
- `url`
- `alt` nullable
- `position`

### Taxonomy Tables

`product_types`
- `id`
- `value` unique

`product_collections`
- `id`
- `title`
- `handle` unique

`product_categories`
- `id`
- `name`
- `handle` unique
- `parent_id` nullable

`product_tags`
- `id`
- `value` unique

### Join Tables

`product_category_links`
- `product_id`
- `category_id`

`product_tag_links`
- `product_id`
- `tag_id`

## Invariants and Validation Rules

- `products.handle` must be unique.
- On create, backend generates a handle when input is empty.
- Every product must have at least one variant.
- `has_variants = false` means the product must have exactly one default variant.
- `has_variants = true` means each variant must map to a valid set of option values.
- Two variants under the same product cannot share the same option-value combination.
- `type` and `collection` are optional single relations.
- `categories` and `tags` are optional many-to-many relations.
- `subtitle`, `description`, `media`, and `attributes` are optional.

## Admin Workflow

### Create Product

- Admin submits `title` and any optional fields.
- Backend generates `handle` if omitted.
- Backend creates the product in `draft`.
- Backend creates one default variant.

### Edit Detail

- Admin can update `title`, `subtitle`, `description`, `handle`, and `media`.
- Changing `title` does not auto-change an existing `handle`.

### Edit Organize

- Admin can assign `type`, `collection`, `categories`, and `tags`.
- Tags may support create-on-input later.

### Edit Attributes

- Admin submits an ordered list of attribute entries.
- Phase one can use replace-all semantics for simplicity.

### Enable Variants

- Admin sets `has_variants = true`.
- Admin defines options and values.
- Admin defines concrete variants and their prices.
- Default variant should be replaced by explicit variants once multi-variant data exists.

### Disable Variants

- Only allowed when the final state resolves to one variant.
- Backend removes or archives option structures and preserves one default variant.

### Publish Product

Publishing should require:

- title present
- at least one variant
- every variant has a valid price
- no duplicate option combination when variants are enabled

## API Shape

Suggested endpoints:

- `POST /api/products`
- `GET /api/products`
- `GET /api/products/:id`
- `PATCH /api/products/:id`
- `PATCH /api/products/:id/organize`
- `PUT /api/products/:id/attributes`
- `PUT /api/products/:id/media`
- `PUT /api/products/:id/options`
- `PUT /api/products/:id/variants`
- `POST /api/products/:id/publish`
- `POST /api/products/:id/archive`

Use whole-block replacement for `attributes`, `media`, `options`, and `variants` in phase one. It keeps the admin form and backend validation simpler than fine-grained patch semantics.

## Error Handling

- Reject duplicate handles with a clear field-level error.
- Reject duplicate variant combinations with a variant-level validation error.
- Reject publish when any variant lacks price.
- Reject invalid taxonomy references with not-found or validation errors.
- Reject disable-variants when more than one effective variant would remain.

## Future Customization Extension

Customization is out of scope now, but the schema should reserve a separate module instead of overloading `products` or `product_variants`.

Recommended future shape:

- `product_customization_profiles`
- `product_customization_zones`
- `product_customization_rules`

Intended use:

- mark whether a product is customizable
- define which zones can be customized
- define rule sets such as line count, overflow behavior, size scaling, or fixed placement

This keeps customization orthogonal to the core catalog model.

## Testing Strategy

Phase one should at minimum cover:

- handle generation and uniqueness
- default variant creation
- variant combination uniqueness
- publish validation
- organize relation persistence
- optional media and attributes persistence

Manual verification should include:

- create product without handle
- create product with default variant only
- switch to variant mode and save multiple variants
- attach categories and tags
- publish and reject incomplete products

## Open Questions Deferred

- Whether SKU is required on every variant.
- Whether tags should support free-create in the first admin release.
- Whether description should be stored as HTML or editor JSON.
- Whether categories need full tree operations in the first phase or only parent linkage.
