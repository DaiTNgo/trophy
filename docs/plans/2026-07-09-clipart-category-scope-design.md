# Clipart Category Scope Design

## Context

The current admin customization inspector models clipart curation at the asset level:

- choose one clipart category
- optionally allow a subset of assets inside that category
- optionally set a default clipart asset

That no longer matches the intended product rule.

For clipart layers, the main configuration boundary should be the clipart category:

- some layers are locked to one fixed category
- other layers allow shoppers to choose from a category allow list

Default category and default clipart are not required. Initial shopper state should be decided by the UI at runtime rather than stored in the template.

## Decision

Replace asset-level clipart curation in the customization inspector with category-level scope rules.

Each clipart-capable layer should express one of these category rules:

- `fixed`: the layer is bound to exactly one clipart category
- `allow_list`: the layer exposes a curated list of allowed clipart categories

The template should not persist:

- default clipart category
- default clipart asset
- asset allow list for this flow

## Recommended UI

### Admin inspector

Keep the existing `Source policy` control, but replace the current clipart asset controls with category scope controls.

For clipart-enabled source policies, show:

- `Category rule`
  - `Fixed category`
  - `Allowed categories`

If `Category rule = Fixed category`:

- show single-select `Clipart category`

If `Category rule = Allowed categories`:

- show multi-select `Allowed categories`

Remove these controls from the inspector for this flow:

- `Default clipart`
- `Allowed clipart media`

### Storefront

If the layer uses `fixed` category scope:

- shopper works only within that one category

If the layer uses `allow_list` category scope:

- shopper can choose among the allowed categories
- the storefront decides the initial state of the picker UI
- no template-level default category or clipart is required

The storefront may choose the first available category, an unselected state, or another UI-driven initial state later. That behavior is a frontend decision, not a persisted authoring rule.

## Data model direction

The current layer shape mixes clipart category, default clipart asset, and allowed clipart assets. That should be simplified.

Recommended structure:

- `clipartCategoryMode: "fixed" | "allow_list"`
- `fixedClipartCategory: { id, name } | null`
- `allowedClipartCategories: Array<{ id, name }>`

The old asset-level fields should be removed from this flow:

- `defaultClipartAsset`
- `allowedClipartAssets`

If any existing preview/runtime code still needs asset lookup, it should derive available assets from the selected category or categories at runtime rather than from an author-authored asset allow list.

## Validation and publish readiness

Validation should move from asset-level completeness to category-level completeness.

For `fixed` category scope:

- exactly one active category must be selected

For `allow_list` category scope:

- at least one active category must be selected

Validation should no longer require:

- a default clipart asset
- a non-empty allowed asset list within a selected category

Runtime and readiness checks should still reject missing or inactive categories.

## Preview/editor behavior impact

The admin preview currently assumes an asset allow list and may show clipart options directly from `allowedClipartAssets`.

That should change to:

- fixed mode: preview clipart options from the fixed category
- allow-list mode: preview category choices first, then clipart options inside the chosen category

Because there is no persisted default clipart, preview can use UI-local state for first render.

## Why this direction

This model fits the actual business rule:

- fixed category is a strict product constraint
- allow-list category is a product-scoped discovery boundary

It also removes authoring noise:

- admins do not need to curate asset subsets unless the product explicitly requires it later
- admins do not need to maintain defaults that the storefront can decide on its own

## Non-goals

This design does not define:

- the exact storefront visual treatment for category switching
- a new asset-level curation feature inside categories
- migration compatibility for the old asset allow list model

Those can be handled separately during implementation if needed.
