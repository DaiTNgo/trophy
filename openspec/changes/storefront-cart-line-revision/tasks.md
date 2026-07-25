## 1. Cart Revision Entry and Routing

- [x] 1.1 Add a review-and-edit action to customizable cart lines, including cart lines currently marked invalid, while retaining ordinary product navigation for other lines.
- [x] 1.2 Link the action to the generic product route with only the source Cart Line ID as a restoration query parameter.
- [x] 1.3 Preserve the restoration query parameter when the generic product route redirects to the category-qualified PDP.

## 2. PDP State Restoration and Revalidation

- [x] 2.1 Resolve the referenced Cart Line after browser-cart hydration and initialize the normal PDP variant, customization values, and quantity-one revision state from it.
- [x] 2.2 Surface a short fallback notice and retain default PDP state when the referenced Cart Line is absent.
- [x] 2.3 Reconcile restored values with the current product/template, retain compatible values, and require shopper correction for invalid variant or required customization state before add.
- [x] 2.4 Keep every normal PDP control available and preserve the current stay-on-PDP behavior after a successful add.

## 3. Independent Cart Addition

- [x] 3.1 Add a transient force-separate add mode to the storefront cart helper and hook that creates a new Cart Line for a revision without persisting source or revision metadata.
- [x] 3.2 Use force-separate add only for a PDP session restored from a Cart Line; preserve ordinary matching-line merge behavior for all other adds.

## 4. Verification and Change Evidence

- [x] 4.1 Add focused cart-helper tests for ordinary matching-line merge and force-separate revision adds, including unchanged revision values.
- [x] 4.2 Add route/component tests for cart-action visibility, query preservation, state restoration after hydration, missing-source fallback, and invalid-restoration blocking.
- [x] 4.3 Run `pnpm --filter router-cf typecheck` and the relevant storefront test suite.
- [ ] 4.4 Run `pnpm --filter router-cf build` and `./init.sh`.
- [x] 4.5 Record implementation evidence, verification results, and any residual risk in this change's `progress.md` and `session-handoff.md`.
