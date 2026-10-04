## Why

The codebase currently has ~500 lines of duplicated UI and logic for editing product options and their values (text pills, color swatches, image swatches, bilingual inputs). This logic is repeated entirely across `create-product-details.tsx` and `product-detail-options.tsx`. Extracting this into a shared component will improve maintainability, ensure consistent behavior across creation and editing flows, and reduce tech debt.

## What Changes

- Extract the duplicated UI and logic for Option Definition editing into a new reusable component: `ProductOptionEditor`.
- Extract the `OptionDraft` type into shared types.
- Refactor `create-product-details.tsx` to use the new component.
- Refactor `product-detail-options.tsx` to use the new component.

## Capabilities

### New Capabilities
- `product-option-editor`: A reusable UI component for defining and editing product options, including display type selection (text, color, image) and value translations.

### Modified Capabilities
- (None - this is a pure refactor of existing capabilities)

## Impact

- `apps/admin/src/pages/create-product/create-product-details.tsx`: Will be refactored to use the new component.
- `apps/admin/src/pages/product-detail/product-detail-options.tsx`: Will be refactored to use the new component.
- `apps/admin/src/components/product/ProductOptionEditor.tsx`: New component to be created.
- Shared types file: Will house the `OptionDraft` type.
