## Context

Admin create product currently has an Organize step with four peer concepts: type, collection, categories, and tags. The project language now distinguishes two storefront browsing surfaces: Shop by Product and Shop by Interest. Shop by Product is a flat category list based on physical product kind. Shop by Interest is a collection list based on occasion, audience, sport, industry, or buying intent.

The backend already stores `typeId`, `collectionId`, category links, and tag links. Storefront listing currently favors category names and falls back to product type when no categories exist. The goal of this change is to clarify the admin workflow and data-entry contract without requiring a schema cleanup.

## Goals / Non-Goals

**Goals:**

- Make the admin create/edit product organization UI match the agreed domain language.
- Treat categories as Shop by Product and keep them as a flat multi-select list.
- Treat collection as Shop by Interest and keep it as a single selected merchandising group.
- Remove type and tags from the primary create/edit product organization forms.
- Keep existing backend type/tag fields compatible and optional until a later cleanup change decides whether to remove them.

**Non-Goals:**

- No D1 schema cleanup for `product_types`, `product_tags`, or `product_tag_links`.
- No migration or backfill of existing product type/tag data.
- No tag-based storefront badge, campaign, search boosting, or workflow behavior.
- No nested category tree behavior for Shop by Product.
- No change to product-owned customization behavior.

## Decisions

### Categories model Shop by Product

Use product categories for the flat Shop by Product browse list. The admin UI should label or describe this field as shopper-facing product-kind placement, and the storefront can use category handles for product-kind navigation.

The rejected alternative was to use `type` for product kind. That would create a one-product-kind limit and duplicate the existing category filter path already used by storefront listing APIs.

### Collections model Shop by Interest

Use product collections for Shop by Interest. A collection represents a merchandising grouping such as sports awards, corporate awards, school and graduation, or employee recognition.

The rejected alternative was to use tags for interest groups. Tags are freeform and therefore harder to keep clean for storefront navigation.

### Keep category assignment multi-select

A product may belong to more than one Shop by Product category. This supports products that naturally cross product-kind browsing groups, such as a crystal trophy that belongs to both trophies and crystal awards.

The rejected alternative was to enforce exactly one category. That would recreate the limitations of `type` and make storefront browse less flexible.

### Hide type and tags from primary product forms

The create product and product detail organization forms should not ask operators to fill `Type` or `Tags` in the primary workflow. Existing backend fields remain nullable and should be omitted or sent empty by the admin form.

The rejected alternative was to keep all four inputs and explain their differences in helper text. That keeps the cognitive load and still allows inconsistent data entry.

## Risks / Trade-offs

- Existing products may have type/tag data that becomes invisible in the primary admin form → Keep backend fields intact and avoid destructive cleanup in this change.
- Storefront listing currently falls back to type when categories are empty → Keep the fallback for existing data, but new admin-created products should rely on categories.
- Removing tags from the primary form may defer useful merchandising behavior → Reintroduce tags later only with a concrete purpose such as badge display, campaign eligibility, search boosting, or internal workflow state.
- Flat categories may become too broad over time → Keep the current scope flat; introduce hierarchy only through a separate change if storefront browsing needs it.
