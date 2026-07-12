## 1. Shared clipart category-scope contract

- [x] 1.1 Replace clipart layer asset-level fields in `packages/customization` with category-scope fields for `fixed` and `allow_list` modes.
- [x] 1.2 Update shared validation and publish-readiness helpers to require active category scope and stop requiring default clipart assets or asset allow lists.
- [x] 1.3 Update shared tests for clipart-capable layer typing, validation, and runtime helpers to match the new category-scope contract.

## 2. Admin editor and preview

- [x] 2.1 Replace the inspector clipart controls with `Category rule`, `Clipart category`, and `Allowed categories` authoring UI as appropriate.
- [x] 2.2 Remove admin editor state and adapters that persist `defaultClipartAsset` or `allowedClipartAssets` for this flow.
- [x] 2.3 Update admin preview behavior to derive clipart options from fixed or allowed categories using UI-local initial state.
- [x] 2.4 Update admin tests covering customization editor validation messages and clipart preview/selection behavior.

## 3. Storefront runtime behavior

- [x] 3.1 Update storefront clipart selection logic to derive assets from category scope instead of template-authored asset allow lists.
- [x] 3.2 Implement shopper-facing handling for fixed-category and allowed-category clipart flows without requiring persisted defaults.
- [x] 3.3 Update storefront tests for clipart selection, cart/customization serialization, and any runtime assumptions about default clipart assets.

## 4. Cleanup and verification

- [x] 4.1 Remove dead code paths that only support asset-level clipart allow-list authoring for this flow.
- [x] 4.2 Run targeted checks for shared package, admin, and storefront clipart-related tests/builds.
- [x] 4.3 Update change-local progress and handoff notes after implementation.
