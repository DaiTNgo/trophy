## Context

The current clipart layer model was built around a single selected category plus an optional asset allow list and default clipart asset. That shape does not match the intended product rule anymore.

The new rule is category-first:

- some layers are locked to one fixed clipart category
- some layers allow shoppers to choose among an admin-defined allow list of categories
- no default category or default clipart asset is required

This change crosses shared customization types, admin editor state, preview behavior, and storefront runtime selection. The repo is in dev mode, so the old asset-level authoring path can be removed rather than compatibility-wrapped.

## Goals / Non-Goals

**Goals:**
- Model clipart scope at the category boundary instead of the asset boundary.
- Let admin authors choose either one fixed category or a category allow list for clipart-capable layers.
- Remove template-authored default category/default clipart requirements from this flow.
- Remove template-authored asset allow lists from this flow.
- Update admin preview and storefront behavior so available clipart assets are derived from the selected category or categories at runtime.
- Update validation and publish-readiness rules to validate active categories rather than a default asset.

**Non-Goals:**
- No new asset-level curation feature inside a category.
- No category marketplace, search, or shopper-facing taxonomy redesign beyond choosing among allowed categories.
- No compatibility layer preserving the old `allowedClipartAssets` and `defaultClipartAsset` contract for this flow.

## Decisions

### Category scope becomes an explicit layer rule

Clipart-capable layers will carry an explicit category scope mode:

- `fixed`
- `allow_list`

For `fixed`, the layer stores exactly one category reference.
For `allow_list`, the layer stores an array of allowed category references.

Alternative considered: infer fixed vs allow-list from the number of selected categories. Rejected because one selected category does not clearly communicate business intent, and it makes validation and UI copy more ambiguous.

### Asset allow lists and template defaults are removed

The layer model will stop persisting:

- `allowedClipartAssets`
- `defaultClipartAsset`

The system will also stop requiring a persisted default category.

Available clipart assets will be derived at runtime from backend-provided clipart assets that belong to the selected fixed category or the currently chosen category from the allowed list.

Alternative considered: keep the existing asset allow list as an optional advanced mode. Rejected because it preserves the wrong authoring boundary and keeps editor/runtime complexity that the current workflow no longer needs.

### Inspector authoring is split into fixed vs allow-list controls

The admin inspector will continue to expose clipart-related controls only for clipart-capable source policies, but the control set changes:

- `Category rule`
  - `Fixed category`
  - `Allowed categories`
- `Clipart category` single select when fixed
- `Allowed categories` multi-select when allow-list

The inspector removes:

- `Default clipart`
- `Allowed clipart media`

Alternative considered: keep `source policy` and add a separate secondary scope concept elsewhere. Rejected because the admin would need to reason across two different control groups to understand one business rule.

### Preview and storefront use UI-local initial state

Because there is no persisted default category or clipart asset, both admin preview and storefront runtime will initialize selection state locally.

Expected behavior:

- fixed scope: initialize against the fixed category
- allow-list scope: UI may start unselected or may choose the first active category locally

The exact first-render choice is a UI decision, not a template contract. Validation must not depend on any default asset existing.

Alternative considered: synthesize and persist an implicit default behind the scenes. Rejected because it recreates the same authoring burden under a different name and leaks UI concerns into template data.

### Validation shifts to category readiness

Shared validation and publish-readiness logic will enforce:

- `fixed` mode must reference one active category
- `allow_list` mode must reference at least one active category

Validation will no longer require:

- non-empty allowed asset subsets
- a default clipart asset

Alternative considered: continue to require an asset-level default for preview stability. Rejected because preview can hold local state, and the business rule no longer demands a default selection.

## Risks / Trade-offs

- Category-only curation removes fine-grained per-layer asset filtering -> acceptable for the current workflow; if product rules later require intra-category curation, it should return as a separate explicit feature.
- Preview and storefront now rely on UI-local initial state -> mitigate by making local selection deterministic and keeping validation independent from it.
- Removing old fields touches several shared and UI modules -> mitigate by changing types first, then fixing compiler-driven fallout in admin/storefront/runtime code.

## Migration Plan

1. Replace shared clipart layer fields with category-scope fields in `packages/customization`.
2. Update validation and publish-readiness helpers to use category-level rules.
3. Update admin inspector/editor state to author fixed vs allow-list categories.
4. Update preview logic to derive clipart options from selected category scope at runtime.
5. Update storefront clipart selection flow to choose categories and assets without persisted defaults.
6. Remove dead asset-level authoring code and tests tied to `allowedClipartAssets` and `defaultClipartAsset`.
7. Verify affected package/app checks.

Rollback is a normal code rollback during dev mode. No compatibility migration is planned.

## Open Questions

- None. The rule is settled: category scope is authored, asset defaults are not.
