## 1. Backend Product Option Model

- [ ] 1.1 Add backend helpers/constants for `Default option`, `Default option value`, complete variant option selection checks, and missing option detection.
- [x] 1.2 Update full-create normalization so products created without custom options persist one default option, one default option value, and one default variant selecting that value.
- [ ] 1.3 Update option replacement/create flows so default option/value are treated as real option data rather than a hidden no-option product mode.
- [ ] 1.4 Update option title and option value update routes so option and value labels rename in place while preserving uniqueness within the product/option.
- [ ] 1.5 Update option value delete route so used values can be deleted and variant-option join rows referencing the deleted value are removed.
- [ ] 1.6 Update variant create/update routes so draft/admin edits can save unreconciled variants but still prevent duplicate complete combinations.
- [ ] 1.7 Update product read models to include enough option-selection state for admin to identify `Missing value` per variant.
- [ ] 1.8 Update publish validation so publish fails when any variant lacks exactly one valid value for every current product option.

## 2. Backend Storefront Contracts

- [ ] 2.1 Update storefront product detail response types to include variant inventory quantity, allow-backorder state, position, ID, price amount, option selections, and any validity fields needed by the storefront.
- [ ] 2.2 Ensure storefront product detail keeps already-published products visible even if some variants are unreconciled.
- [ ] 2.3 Add or update pure helper coverage for valid variant selection, missing option detection, Contact Price selection, out-of-stock purchase availability, and auto-reselection ordering.
- [ ] 2.4 Add admin product route contract tests for default option/value creation, option/value rename, used value deletion, `Missing value`, and publish blocking.
- [ ] 2.5 Add storefront product route contract tests for default option data, disabled-combination data, Contact Price fields, and inventory/backorder fields.

## 3. Admin UI

- [x] 3.1 Update admin product create flow so default-only products submit default option/value/variant selections to the backend.
- [ ] 3.2 Update admin product detail options UI to render default option/value as normal editable data.
- [ ] 3.3 Update option value editing UI so value labels can be renamed in place.
- [ ] 3.4 Update option value delete UI to allow deleting values used by variants without forcing immediate replacement.
- [ ] 3.5 Update variants table to show `Missing value` for each missing option selection.
- [ ] 3.6 Update variant editor so unreconciled variants can be assigned valid replacement values or deleted.
- [ ] 3.7 Update publish error display so unreconciled variant publish failures are visible and actionable.

## 4. Storefront Product Detail

- [ ] 4.1 Implement a pure storefront variant-selection model that derives valid variants, disabled option values by current selection context, and first-valid auto-reselection by variant position then ID.
- [ ] 4.2 Render `Default option` / `Default option value` as real option data while auto-selecting it when it is the only path.
- [ ] 4.3 Disable only option values that are invalid for the current combination, without globally hiding unavailable values.
- [ ] 4.4 Auto-reselect the first valid variant on initial load and after any selection change that invalidates the current variant.
- [ ] 4.5 Keep Contact Price variants selectable and show `Contact for price` as the primary CTA before stock/backorder states.
- [ ] 4.6 Keep out-of-stock variants selectable; show disabled `Out of stock` for priced variants without backorder and `Add to cart` for priced variants with backorder.
- [ ] 4.7 Ensure cart add only runs for selected priced variants that are purchasable under the purchase availability rules.

## 5. Contact Price Inquiry

- [ ] 5.1 Add a Contact Price inquiry entry point from product detail that requires a valid selected variant.
- [ ] 5.2 Capture product ID, variant ID, option labels/values, any entered customization values, and shopper contact details in the inquiry payload.
- [ ] 5.3 Ensure Contact Price inquiry does not create cart lines, checkout items, orders, or order drafts.
- [ ] 5.4 Preserve existing cart hydration and order creation rejection paths for Contact Price variants.
- [ ] 5.5 Add storefront tests for Contact Price CTA precedence, inquiry payload capture, and disabled inquiry when no valid variant exists.

## 6. Verification And State

- [ ] 6.1 Run `pnpm --filter backend test`, `pnpm --filter backend check`, and `pnpm --filter backend build`.
- [ ] 6.2 Run relevant admin tests if added, plus `pnpm --filter admin build`.
- [ ] 6.3 Run relevant storefront tests if added, plus `pnpm --filter router-cf typecheck` and `pnpm --filter router-cf build`.
- [ ] 6.4 Run `openspec validate medusa-default-option-variant-behavior --strict`.
- [ ] 6.5 Run `./init.sh`.
- [ ] 6.6 Update `openspec/changes/medusa-default-option-variant-behavior/tasks.md`, create/update change-local `progress.md` and `session-handoff.md`, and update repo-level state only if cross-change coordination needs it.
