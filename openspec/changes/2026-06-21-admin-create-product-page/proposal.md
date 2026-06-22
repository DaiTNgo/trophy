# Admin Create Product Page Proposal

## Why

The admin needs a Medusa-like create product flow so operators can add new products without depending on a future backend-first implementation. The flow must reflect the target catalog model, including default variant behavior, organize fields, options, variants, and draft or publish transitions.

## What Changes

- Add a Medusa-like create product page to the admin spec.
- Define the product creation workflow, default values, and validation rules.
- Define mock-first contracts for create and publish operations.

## Impact

- Frontend work can begin on a realistic product creation flow immediately.
- Backend planning can target an explicit create contract aligned with the catalog model.
- Future product detail and product list flows can rely on a shared product creation shape.
