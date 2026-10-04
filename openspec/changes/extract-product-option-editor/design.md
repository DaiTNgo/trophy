## Context

The `apps/admin/src/pages/create-product/create-product-details.tsx` and `apps/admin/src/pages/product-detail/product-detail-options.tsx` files currently share about 500 lines of duplicated code for rendering and managing product options (display types: text, color, image; bilingual text inputs). This makes updating the product option UI error-prone as changes must be mirrored in two places.

## Goals / Non-Goals

**Goals:**
- Eliminate the duplicate code by extracting it into a single, reusable component.
- Ensure both the "Create Product" and "Edit Product" flows use the exact same UI and logic for options.

**Non-Goals:**
- We are not changing the backend API or how options are saved.
- We are not redesigning the user interface of the product options editor itself.

## Decisions

1. **Extract `ProductOptionEditor` component**
   - **Location**: `apps/admin/src/components/product/ProductOptionEditor.tsx`
   - **Rationale**: Keeps it colocated with other product editors like `ProductOrganizeEditor.tsx` and `ProductAttributesEditor.tsx`.
   - **Props Interface**: Fully controlled component.
     - `option: OptionDraft`
     - `onChange: (option: OptionDraft) => void`
     - `onRemove?: () => void` (If provided, renders the 'X' remove button. Omitted in drawer contexts).
     - `titleLocale: AdminLocale`
     - `onTitleLocaleChange: (locale: AdminLocale) => void`
     - `disabled?: boolean`

2. **Extract `OptionDraft` type**
   - **Location**: Define it and export it (e.g. from `apps/admin/src/types/index.ts` or a suitable shared location).
   - **Rationale**: Both the create and edit flows need to manage state adhering to this shape.

## Risks / Trade-offs

- [Risk] Differences in `create-product` vs `product-detail` local state might require tweaking the parent component's state management to fit the `OptionDraft` interface.
  → Mitigation: We will map the parent's state arrays into `OptionDraft` objects before passing to the component, and map them back on `onChange`.
