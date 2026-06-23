# Admin Create Product Page Proposal

## Why

The admin needs a create product experience that matches Medusa's information architecture and operator workflow closely enough that merchandising users can move between the two without relearning the task, but without pulling in Medusa's full catalog complexity. The current mock-first page captures some of the same data, but it does not yet align cleanly with either the approved thin-scope business requirements or Medusa's tab purposes.

## What Changes

- Redefine the create product flow as a Medusa-like three-tab workflow: `Details`, `Organize`, and `Variants`.
- Define the purpose of each tab and the expected footer actions across the workflow.
- Specify the variant-enabled UX in `Details`, including the product-options authoring model with option titles and multiple values.
- Keep project-specific descriptive `attributes` in `Details`.
- Specify the `Variants` tab as the place where admins edit variant rows and commercial data such as SKU, inventory quantity, optional backorder behavior, and prices.
- Extend the `Variants` tab contract so each variant can manage its own uploaded media assets for shopper preview and variant disambiguation.
- Clarify draft and publish validation rules for default-variant and variant-enabled products.
- Keep the create contract mock-first compatible while aligning the shape with the approved Medusa-thin catalog scope.
- Remove unsupported Medusa-full fields such as shipping profiles, sales channels, and inventory-kit controls from the v1 workflow.

## Impact

- Frontend implementation can stop guessing at Medusa parity and instead build against a concrete UX contract.
- The create product route and the later product detail flow can share a more accurate variant model.
- Backend contracts can align with a variant grid and option-definition workflow instead of a preview-card workflow.
- Merchandising users can attach preview imagery directly to each variant so shoppers can distinguish the exact option combination they are considering.
