# Storefront Orders Session Handoff

## Scope

OpenSpec change: `storefront-orders`

This change defines the backend order creation contract for storefront checkout. It covers multi-item order creation, manual payment methods, immutable item snapshots, backend price capture, Contact Price rejection, different shipping address capture, and customization snapshot capture.

## Artifacts

- `proposal.md`: summary of the new storefront order capability.
- `design.md`: data model and validation decisions.
- `specs/storefront-orders/spec.md`: testable requirements for route behavior and snapshots.
- `tasks.md`: implementation checklist.
- `progress.md`: current state and next step.

## Key Decisions

- Request item selection is `productId + variantId + quantity`.
- Frontend does not submit trusted price, product title, variant title, SKU, background, layers, or rendered design.
- Backend reads product/variant/price/customization data at order request time.
- Variant `priceAmount: null` means Contact Price and must be rejected by order creation.
- Customizable products require `customization.values`; non-customizable products reject customization data.
- Backend stores raw customization values, backend-rendered design snapshot, template snapshot, and selected variant background snapshot.
- `payment.method` is `bank_transfer` or `cash_on_delivery`; no online payment gateway is in scope.
- Non-customized items start `productionStatus = "not_required"`; customized items start `productionStatus = "pending_review"`.

## Resume Steps

1. Read this folder's `proposal.md`, `design.md`, `specs/storefront-orders/spec.md`, `tasks.md`, and `progress.md`.
2. Run `openspec validate storefront-orders --strict`.
3. Start implementation with `tasks.md` section 1 and update checkboxes as tasks complete.
4. Keep progress and evidence in this folder, not root `progress.md`.
