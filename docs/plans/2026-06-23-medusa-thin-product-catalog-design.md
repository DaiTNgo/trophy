# Medusa-Thin Product Catalog Design

## Purpose

Align the existing product catalog work with Medusa's core product mental model without adopting Medusa's full feature surface. The target is a single-market, single-currency catalog with product variants, collections, categories, and basic variant-level inventory.

This design updates the current repository direction. It does not restart the product model from scratch.

## Design Principles

- Keep Medusa's information architecture where it improves operator UX.
- Remove Medusa capabilities that add operational complexity without serving the approved v1 scope.
- Preserve the repo's decision to keep product customization as a separate domain.
- Keep product pricing owned by variants only.
- Keep inventory at the variant total-quantity level only.

## Scope

### In Scope

- Product records with title, handle, subtitle, description, media, and status.
- Product options and option values that generate variants.
- Variant-level price.
- Variant-level inventory quantity.
- Variant-level media for shopper preview and visual disambiguation.
- Optional collection assignment.
- Optional multi-category assignment.
- Optional descriptive attributes defined in the product details flow.
- Admin create and edit UX modeled after Medusa's core product workflow.

### Out of Scope

- Sales channels.
- Shipping profiles.
- Inventory kits.
- Bundles or multi-part products.
- Tiered pricing.
- Region pricing.
- Multi-currency pricing.
- Translations.
- Medusa inventory-location model.
- Customization or personalization behavior inside the product domain.

## Current Base to Preserve

The current repository already has the right foundation:

- Product create flow uses `Details`, `Organize`, and `Variants`.
- Backend schema already has normalized product, option, option value, variant, category, collection, media, and attribute tables.
- Backend routes already support section-scoped updates and publish validation.

Implementation should refine this base, not replace it.

## Product Domain Model

### Core Entities

- `products`
  - `title`
  - `subtitle`
  - `handle`
  - `description`
  - `status`
  - `has_variants`
  - `collection_id`
- `product_media`
  - shared product-level media
- `product_categories`
  - hierarchical taxonomy
- `product_category_links`
  - many-to-many product/category assignment
- `product_options`
  - option titles such as `Color` or `Size`
- `product_option_values`
  - option values such as `Black` or `XL`
- `product_variants`
  - `title`
  - `sku`
  - `price_amount`
  - `inventory_quantity`
  - optional `allow_backorder`
  - `is_default`
- `product_variant_media`
  - one or more media assets attached to a specific variant
  - used to show the correct shopper preview for the selected variant
- `product_variant_option_values`
  - normalized mapping between variants and option values
- `product_attributes`
  - descriptive metadata added by this project

### Optional Supporting Entities

- `product_collections`
- `product_types`
- `product_tags`

`product_types` and `product_tags` may remain in the backend model, but they should not drive v1 UX complexity.

## Required Simplifications from the Current Repository

### Remove from v1 UX and spec

- `discountable`
- `shipping profile`
- `sales channels`
- `has inventory kit`
- `low stock` as a product status

### Keep in v1 UX and spec

- `attributes` in `Details`
- `collection`
- `categories`
- variant-owned pricing
- default-variant fallback

### Optional to keep, but secondary

- `type`
- `tags`

If retained, these should be optional metadata and not block draft or publish.

## Status Model

Use a simplified authoring lifecycle:

- `draft`
- `published`

If `archived` remains in backend routes, treat it as an administrative action, not a core create-flow state.

Do not model `low stock` as a product status. Low stock is derived inventory state, not content lifecycle.

## Create Product UX

### 1. Details

Purpose: define identity, descriptive content, attributes, and variant structure.

Fields:

- `Title`
- `Handle`
- `Subtitle`
- `Description`
- `Media`
- `Attributes`
- `This product has variants`

When variant mode is enabled:

- show `Product options`
- allow option title entry
- allow option values as chips
- preview the generated variant structure before pricing

When variant mode is disabled:

- create one default variant automatically

### 2. Organize

Purpose: assign lightweight merchandising structure without mixing in pricing or inventory logic.

Fields:

- `Collection`
- `Categories`
- optional `Type`
- optional `Tags`

This step must not include shipping or sales-channel concepts in v1.

### 3. Variants

Purpose: edit sellable units and commercial rows.

Per variant row:

- `Title`
- `SKU`
- `Price`
- `Inventory quantity`
- optional `Allow backorder`
- `Variant media uploads`

This step must not include inventory-kit controls.

## Product Detail UX

Use a Medusa-like section workspace, but trimmed to v1:

- `Overview`
- `Organize`
- `Media`
- `Attributes`
- `Options`
- `Variants`
- `Publish status`

Do not include:

- shipping configuration
- sales channels
- inventory kits

## Validation Rules

### Draft

Allow draft creation with minimal identity data:

- `title` required
- unique handle generated if omitted
- one default variant exists even when variants are disabled

### Publish

Publishing requires:

- valid product title
- at least one variant
- every variant has a valid price
- if variant mode is enabled, each variant has exactly one value from every option
- no duplicate variant option combinations

Inventory quantity should not block publish unless the team later chooses to require it.

## Implementation Alignment Notes

### Backend

The backend already supports most of this shape. The next alignment work should focus on:

- adding `inventory_quantity` to variants if not already persisted
- optionally adding `allow_backorder`
- simplifying allowed status usage in API contracts
- removing or ignoring unsupported Medusa-full fields from admin-facing contracts

### Admin

The admin mock model should stop depending on:

- `shippingProfile`
- `salesChannels`
- `hasInventoryKit`
- `Low stock` as a product status

The admin detail flow should be aligned to the normalized backend model rather than older preview-only form helpers.

## Decision Summary

This project will use a Medusa-thin catalog:

- Medusa-like structure
- project-specific attributes in details
- simplified commerce operations
- separate customization domain

That gives the team familiar product authoring UX without inheriting Medusa's full operational complexity.
