## Context

Medusa Admin seeds `Default option`, `Default option value`, and `Default variant` when an operator creates a product without explicit variants. Trophy currently has the same variant table shape, but the create flow can persist a default variant without option definitions, and backend validation treats variant-disabled products as having no option selections.

The current database schema already has `product_options`, `product_option_values`, `product_variants`, and `product_variant_option_values`. The gap is behavioral: Trophy needs to treat the default option/value as real data, support temporary unreconciled variants after option value deletion, and make storefront selection logic deterministic when some combinations are unavailable.

The change crosses the backend admin route surface, storefront route surface, admin product detail UI, storefront product detail UI, and cart/order boundaries. Backend route contract tests are required for changed admin and storefront API behavior.

## Goals / Non-Goals

**Goals:**
- Persist `Default option` / `Default option value` as real product option data when products are created without operator-defined variation axes.
- Preserve one option-and-variant model for simple and variant products.
- Allow option and option value labels to be renamed in place.
- Allow option values to be deleted even when variants reference them, leaving affected variants with `Missing value` until reconciled.
- Block new publish attempts while any variant does not have exactly one valid value for every current product option.
- Return storefront product detail data that supports visible disabled combinations and deterministic auto-reselection.
- Keep Contact Price variants selectable, route `Contact for price` to inquiry, and keep Contact Price out of cart/order creation.
- Keep out-of-stock variants selectable while purchase CTA state reflects inventory and backorder.

**Non-Goals:**
- No Medusa backend integration or import/export workflow.
- No historical data migration unless implementation discovers current local data must be normalized for tests.
- No full quote-management CRM for Contact Price inquiries; this proposal defines inquiry entry and captured data only.
- No change to product-owned customization template authoring beyond inquiry snapshot inclusion.
- No new public checkout path for Contact Price items.

## Decisions

### Use real default option/value rows for simple products

Products without operator-defined variation axes will still persist one option titled `Default option`, one value titled `Default option value`, and one default variant selecting that value.

Rationale: this matches the Medusa Admin mental model chosen in `CONTEXT.md` and removes the special case where a variant can have no option selections. Storefront and admin can reason over one option/variant graph.

Alternative considered: keep a hidden default variant with no option rows. This is simpler internally but contradicts the decided Medusa-style UI and keeps two product modes alive.

### Treat `hasVariants` as a UI mode hint, not the source of truth for option existence

The backend should derive product option behavior from persisted options and variant selections. `hasVariants` may continue to drive admin copy or layout, but routes should not reject option selections merely because `hasVariants` is false when default option data exists.

Rationale: default option/value is real data. Requiring `hasVariants` before option selections would make the chosen domain model inconsistent.

Alternative considered: set `hasVariants = true` for all products. This is viable, but it may blur admin UX meaning if existing code uses the flag to distinguish operator-created variants from default-only products.

### Store unreconciled variants by deleting join rows, not by keeping dangling references

When an option value is deleted, remove the `product_option_values` row and any `product_variant_option_values` join rows referencing it. A variant becomes unreconciled when it has fewer valid option selections than the current option count.

Rationale: SQLite tables currently do not declare foreign keys here, but keeping dangling IDs would make read models fragile. Missing selection can be derived from the current option set and variant join rows.

Alternative considered: add a tombstone/deleted option value state. That would preserve exact labels for deleted values but adds schema and lifecycle complexity that is not needed for admin reconciliation.

### Publish validation is strict; draft/admin editing is permissive

Admin draft/detail mutations may save unreconciled variants. Publish validation must fail if any variant lacks exactly one valid value for every current product option, has duplicate option selections, or maps more than one value to the same option.

Rationale: operators need freedom to delete/rebuild option values without a forced replacement modal, but published storefront data needs a coherent variant-selection graph.

Alternative considered: force replacement during option value deletion. The user explicitly rejected forced replacement flow.

### Storefront exposes disabled combinations instead of hiding products

For already-published data that later contains unreconciled variants, the storefront should still show the product. Option values remain visible, but values that do not resolve to a valid variant in the current selection context are disabled.

Rationale: this preserves the shopper's browsing context and matches the user's expectation. It also gives deterministic behavior if published data becomes stale after admin edits.

Alternative considered: filter out the whole product or drop invalid variants. Filtering the product is too destructive; dropping invalid variants can make option availability confusing unless the API/UI still understands why combinations are unavailable.

### Auto-reselection uses variant position then ID

When the current storefront selection is invalid, choose the first valid variant ordered by `position`, then `id`.

Rationale: this is stable, admin-controlled, and avoids hidden business prioritization by price or stock.

Alternative considered: choose the cheapest or in-stock variant. That would mix selection validity with merchandising or purchase availability.

### Option validity is separate from purchase availability

A valid variant remains selectable even when it has Contact Price, zero inventory, or no backorder. Contact Price controls the primary CTA first. If the variant has a numeric price, zero inventory with backorder disabled shows disabled `Out of stock`; zero inventory with backorder enabled keeps `Add to cart`.

Rationale: option controls answer "does this combination exist?" while CTA answers "what can the shopper do next?"

Alternative considered: disable out-of-stock option combinations. This hides real variants and makes stock changes alter option availability unexpectedly.

### Contact Price inquiry is separate from cart/order creation

Clicking `Contact for price` starts an inquiry with product ID, variant ID, option snapshot, entered customization values, and shopper contact details. It must not create a cart line, checkout item, order, or order draft.

Rationale: order creation requires a price snapshot and total. Contact Price is a pre-order inquiry state.

Alternative considered: create a zero-price draft order. This conflicts with the existing `Contact Price Inquiry` and `Order Price Snapshot` glossary terms and risks treating unpriced selections as orders.

## Risks / Trade-offs

- Existing products with no option rows may render differently after this change -> normalize during read/create/update paths in dev mode and add route tests for default option/value creation.
- Allowing used option values to be deleted creates temporary invalid admin states -> make `Missing value` visible in admin tables and block publish with a specific error.
- Storefront option availability can become complex with multiple options -> keep the algorithm pure and test it with worked examples for valid, disabled, out-of-stock, Contact Price, and unreconciled combinations.
- Contact Price inquiry scope could grow into quote management -> keep this slice to inquiry entry/captured payload and explicitly exclude operator quote lifecycle.
- Existing cart/order code already rejects Contact Price variants -> preserve that boundary while adding the inquiry path so shoppers have an action.

## Migration Plan

1. Update backend create/full-create normalization so default-only products persist default option/value/variant selections.
2. Update admin option/value mutation routes to support in-place value rename and used value deletion with join cleanup.
3. Update read models to surface missing option selections as admin-only `Missing value` state and storefront validity metadata.
4. Update publish validation before changing storefront UI so invalid published states cannot be newly introduced.
5. Update storefront detail selection and CTA behavior.
6. Add Contact Price inquiry entry and backend route only if no suitable contact endpoint exists.
7. Verify backend route tests, admin build/tests, storefront typecheck/build, OpenSpec validation, and `./init.sh`.

Rollback is straightforward in dev mode: revert the code changes and clear any local products created with default option/value rows if they block older assumptions.

## Open Questions

- None for the proposal. The user accepted the recommended answers from the grill session; implementation should follow `CONTEXT.md` as the current source of domain language.
