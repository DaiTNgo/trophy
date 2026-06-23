# Admin Product Detail Page Proposal

## Why

The admin needs a Medusa-like product detail page so operators can manage one product through sectioned editing rather than a flat list view. Product detail needs to expose overview, organize, media, attributes, options, variants, and publish state in one coherent workspace, but it should stay within the approved Medusa-thin catalog scope rather than introducing unsupported full-Medusa controls.

## What Changes

- Add a Medusa-like product detail page to the admin spec.
- Define section-based product editing behavior for the thin-scope catalog model.
- Define mock-first contracts for loading and saving the product aggregate.
- Exclude shipping profiles, sales channels, and inventory-kit editing from the v1 detail workspace.

## Impact

- Frontend planning can build a realistic product workspace before the backend is complete.
- Backend planning can shape a product aggregate compatible with detail editing.
- Product-related admin behavior becomes consistent with the earlier product catalog design.
