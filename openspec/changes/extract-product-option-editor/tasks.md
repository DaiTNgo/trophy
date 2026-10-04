## 1. Type Extraction

- [x] 1.1 Extract `OptionDraft` interface into `apps/admin/src/types/index.ts` (or appropriate shared type file).
- [x] 1.2 Update `product-detail-options.tsx` to import the new shared `OptionDraft` type.
- [x] 1.3 Ensure `OptionDraft` structure supports both file needs (displayType, translations, values).

## 2. Component Creation

- [x] 2.1 Create file `apps/admin/src/components/product/ProductOptionEditor.tsx`.
- [x] 2.2 Copy the duplicated outer layout and input structure from `create-product-details.tsx` into the new component.
- [x] 2.3 Wire up the controlled props: `option`, `onChange`, `onRemove`, `titleLocale`, `onTitleLocaleChange`, and `disabled`.
- [x] 2.4 Verify all nested components (like `ColorSwatchPicker`, `ImageSwatchPicker`, `LocalizedTextField`) are correctly imported.

## 3. Integration & Refactoring

- [x] 3.1 Refactor `apps/admin/src/pages/create-product/create-product-details.tsx` to map over its options and render `ProductOptionEditor`.
- [x] 3.2 Ensure the mapping in `create-product-details` converts its internal state shape to `OptionDraft` and back if necessary.
- [x] 3.3 Refactor `apps/admin/src/pages/product-detail/product-detail-options.tsx` to use `ProductOptionEditor`.
- [x] 3.4 Ensure `product-detail-options` passes the `disabled` prop and maps its individual states into the single `OptionDraft` object expected by the component.

## 4. Verification

- [x] 4.1 Run TypeScript compiler checks (`pnpm --filter admin build`) to ensure type safety.
- [x] 4.2 Verify no functionality was lost (adding text/color/image values works in both flows).
