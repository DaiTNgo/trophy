## 1. Shared Contract And Schema

- [x] 1.1 Define product-owned customization types for enabled state, canvas dimensions, layers, and form fields without persisted background assets.
- [x] 1.2 Add validation helpers for draft product customization shape and publish-ready product customization.
- [x] 1.3 Add product-owned customization database schema with a one-to-one product relationship.
- [x] 1.4 Add ordered variant media schema linking product variants to product assets with stable position.
- [x] 1.5 Remove or isolate create-product dependencies on standalone customization template/revision persistence.

## 2. Backend Full-Create And Read Models

- [x] 2.1 Add full-create product input schema covering details, organization metadata, attributes, options, variants, variant media, and optional customization.
- [x] 2.2 Implement full-create draft persistence for product-owned customization, including incomplete customization state.
- [x] 2.3 Implement full-create publish validation that rejects missing variant images, mismatched image dimensions, and invalid customization editor models.
- [x] 2.4 Return created products with variants, ordered variant media, and product customization summary when enabled.
- [x] 2.5 Update product read APIs used by admin/storefront to include ordered variant media and product-owned customization data.
- [x] 2.6 Add backend tests for draft success, publish readiness failures, publish success, disabled customization omission, and variant media ordering.

## 3. Admin Create Product Workflow

- [x] 3.1 Add the product-level customization switch to the Details tab and include customization state in create product form state.
- [x] 3.2 Add the Customization tab to the right of Variants only when customization is enabled.
- [x] 3.3 Add missing-image and image-dimension validation for created variants before allowing navigation into Customization.
- [x] 3.4 Show clear guidance in the Variants tab explaining that customizable product images must all have the same dimensions.
- [x] 3.5 Replace mock/local create submission for this flow with backend full-create submission.
- [x] 3.6 Preserve temporary embedded customization state while the switch is toggled during the current create session, but omit it from submission when disabled.

## 4. Embedded Customization Editor

- [x] 4.1 Adapt the existing full customization editor to run in embedded product-create mode.
- [x] 4.2 Remove standalone template save, publish, revision, and background upload controls from embedded mode.
- [x] 4.3 Convert the Background panel in embedded mode into a variant-image preview selector.
- [x] 4.4 Ensure preview background switching changes only the admin preview canvas and does not persist a customization background asset.
- [x] 4.5 Persist embedded editor layers and form fields through the product full-create payload.
- [x] 4.6 Add admin verification for tab gating, background preview switching, and product-owned create submission.

## 5. Storefront Selected Variant Preview

- [x] 5.1 Load product-owned customization config and ordered variant media for storefront product pages.
- [x] 5.2 Render customization preview against the selected variant's first media image.
- [x] 5.3 Update variant selection so changing variants updates the customization preview background.
- [x] 5.4 Ensure the shopper customization form does not render a separate background picker.
- [x] 5.5 Add storefront verification for selected-variant background rendering and stable layer placement.

## 6. Cleanup And Verification

- [x] 6.1 Remove deprecated template/revision code paths that are replaced inside the product-owned customization scope.
- [x] 6.2 Update local state docs for the OpenSpec change with implementation notes and restart guidance.
- [x] 6.3 Run `pnpm --filter customization test` and any shared package checks.
- [x] 6.4 Run `pnpm --filter backend check` and `pnpm --filter backend build`.
- [x] 6.5 Run `pnpm --filter admin build`.
- [x] 6.6 Run `pnpm --filter router-cf typecheck` and `pnpm --filter router-cf build`.
- [x] 6.7 Run `openspec validate product-owned-customization --strict`.
- [x] 6.8 Run `./init.sh` before marking the change complete.
