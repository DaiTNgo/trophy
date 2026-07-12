## Why

The current clipart layer inspector still models curation at the asset level, which conflicts with the intended product rule. Admins need to configure clipart availability at the category boundary first: either lock a layer to one fixed category or allow shoppers to choose among an admin-defined category allow list.

## What Changes

- **BREAKING** Replace clipart asset allow-list authoring in the customization inspector with category-scope authoring.
- Add an explicit clipart category rule for clipart-capable layers:
  - `fixed` for one required category
  - `allow_list` for multiple allowed categories
- Remove template-authored `default clipart category` and `default clipart asset` requirements for this flow.
- Remove template-authored `allowed clipart assets` for this flow; runtime clipart options should derive from the selected category or categories.
- Update admin preview and storefront clipart pickers to work from category scope instead of asset allow lists.
- Update validation and publish-readiness rules to require valid active categories rather than a default asset and allowed asset subset.

## Capabilities

### New Capabilities
- `customization-clipart-category-scope`: Defines category-level clipart scoping for customization layers across admin authoring, preview, and shopper-facing selection.

### Modified Capabilities
- None.

## Impact

- `packages/customization`: layer types, validation, preview/runtime helpers, and tests for clipart category-scope rules.
- `apps/admin`: customization inspector, embedded/full-screen editor state, preview behavior, and related tests.
- `apps/storefront`: shopper clipart selection behavior and any runtime logic that assumes asset allow lists or template-authored defaults.
- Backend-backed clipart category data remains the source for available assets, but no new asset-level curation contract is added for this flow.
