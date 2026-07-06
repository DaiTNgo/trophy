## Why

Trophy's product model currently treats variant-disabled products as having a default variant with no option selections, while Medusa Admin exposes `Default option` / `Default option value` as real product option data. We need to align Trophy's admin, backend, and storefront behavior with the Medusa-style option-and-variant model so product detail, variant selection, Contact Price, and publish readiness all share one predictable contract.

## What Changes

- Create literal `Default option` / `Default option value` records for products without operator-defined variation axes.
- Treat default option/value as real option data in admin product detail and storefront variant-selection logic.
- Allow option title and option value label edits in place.
- Allow deleting option values even when variants use them, leaving affected variants in a temporary `Missing value` state.
- Block new product publish attempts while any variant is missing a valid value for a current product option.
- Keep already-published products visible on the storefront, while disabling option combinations that cannot resolve to a valid variant.
- Auto-reselect the first valid variant by variant position, then variant ID, when the current storefront selection becomes invalid.
- Keep Contact Price variants selectable, show `Contact for price` as the primary CTA before stock/backorder CTA states, and route clicks into a Contact Price inquiry flow instead of cart/order creation.
- Keep out-of-stock variants selectable while reflecting purchase availability in the CTA.
- No database migrations are part of this proposal unless implementation discovers a required schema change; the repo is in dev mode and can update current schema/contracts directly.

## Capabilities

### New Capabilities
- `medusa-product-options-and-variant-selection`: Defines Medusa-style default option/value persistence, admin option and variant reconciliation, storefront option availability, variant auto-reselection, purchase CTA precedence, and Contact Price inquiry behavior.

### Modified Capabilities
None. This repository does not currently have archived canonical specs under `openspec/specs/`; this change introduces one cross-cutting capability and lists affected existing route surfaces under Impact.

## Impact

- Backend admin product routes under `apps/backend/src/routes/admin/products.ts`, including full-create, option/value mutation, variant mutation, publish validation, and route contract tests.
- Backend storefront product routes under `apps/backend/src/routes/storefront/products.ts`, including detail response shape and route contract tests.
- Storefront product detail and cart/order flows under `apps/storefront`, including option selection, CTA state, and Contact Price inquiry entry.
- Admin product detail/create flows under `apps/admin`, including option/value editing, `Missing value` rendering, and publish error display.
- Shared domain docs in `CONTEXT.md`, plus progress and handoff state for restartability.
