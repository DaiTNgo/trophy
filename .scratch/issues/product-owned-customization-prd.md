---
title: Product-Owned Customization In Create Product
labels:
  - ready-for-agent
status: ready-for-agent
---

## Problem Statement

Admins can build rich customization templates today, but that flow exists as a separate template lifecycle from product creation. The desired product creation workflow needs customization to be an intrinsic part of a product: an admin marks a product as customizable, finishes variant media, configures blocks in a full customization editor, and saves or publishes the product with that customization configuration.

The current separation creates the wrong mental model. Product variants provide the background images that storefront shoppers see, while customization blocks need to be positioned once and render correctly across every variant image. A separate customization template background, draft state, publish action, and revision history do not match this product-owned workflow.

## Solution

Create a product-owned customization flow inside admin product creation. The Details tab includes an `is_customizable` switch. When enabled, the create product modal adds a Customization tab to the right of Variants. The Customization tab uses the full existing customization editor experience, but its lifecycle is controlled by the product: there is no separate customization save, publish, template, or revision action.

Admins must define variant information and upload media before entering the Customization tab. Each variant that will be created must have at least one image for a customizable product to be publishable. All variant images for a customizable product must share identical pixel dimensions. The editor uses those variant images as admin preview backgrounds so the admin can test block placement against each product blank. The customization config stores canvas size and editor rules, but does not store independent background assets.

Storefront customization preview uses the selected variant's image as the background. Shoppers do not choose a separate customization background; they choose product variants through the product flow, and the customization preview follows that selected variant.

## User Stories

1. As an admin, I want to mark a product as customizable while creating it, so that customization is configured as part of the product setup.
2. As an admin, I want the customization switch to live in product details, so that I make the product-level customization decision early.
3. As an admin, I want a Customization tab to appear only when customization is enabled, so that non-customizable products keep a simpler create flow.
4. As an admin, I want the Customization tab to appear to the right of Variants, so that variant media is established before customization placement.
5. As an admin, I want to be blocked from entering Customization until variant information and required media are ready, so that the editor always has real product backgrounds.
6. As an admin, I want every variant that will be created to require at least one image before publishing a customizable product, so that every shopper variant can render a customization preview.
7. As an admin, I want draft products to allow incomplete customization setup, so that I can come back later to finish media or blocks.
8. As an admin, I want publishing to fail when a customizable product is missing required variant images, so that shoppers never see broken customization previews.
9. As an admin, I want all variant images for a customizable product to be required to share one pixel size, so that block placement remains consistent across blanks.
10. As an admin, I want size mismatches to be shown as clear UI errors, so that I know which media needs replacing.
11. As an admin, I want the UI to explain that customizable product images must have identical dimensions, so that I upload production-ready blanks intentionally.
12. As an admin, I want the first image on each variant to behave as that variant's default preview background, so that ordering media has predictable storefront impact.
13. As an admin, I want variant media ordering to persist, so that the "first image" rule is stable after save and reload.
14. As an admin, I want the Customization Background panel to show variant images, so that I can test blocks against every uploaded blank.
15. As an admin, I want to switch preview backgrounds inside the editor, so that I can verify the same block layout works across all variants.
16. As an admin, I want the Customization editor to be the full editor, so that I can configure text blocks, image shapes, paths, colors, fonts, formatting, layer ordering, and form fields without leaving create product.
17. As an admin, I want no separate customization "Save draft" button inside create product, so that product save remains the single source of truth.
18. As an admin, I want no separate customization "Publish template" action inside create product, so that publishing follows product status only.
19. As an admin, I want disabling customization before submit to omit customization config from the product, so that the product is not accidentally treated as customizable.
20. As an admin, I want temporary customization edits to remain in the session if I toggle customization off and on before submit, so that accidental toggles do not immediately destroy work.
21. As an admin, I want saving as draft to persist product customization progress, so that unfinished products are restartable.
22. As an admin, I want reopening a draft customizable product to restore the editor config, so that I can continue from the last saved state.
23. As an admin, I want a single create action to save product data, variants, variant media, and customization config together, so that partial products are avoided.
24. As an admin, I want backend validation to enforce publish readiness, so that UI bugs cannot publish invalid customizable products.
25. As a shopper, I want the customization preview background to follow the variant I selected, so that the preview matches the product I intend to buy.
26. As a shopper, I want customization blocks to stay in the intended positions across variants, so that the final product design is predictable.
27. As a shopper, I do not want a separate background picker inside customization, so that variant selection remains the only product blank choice.
28. As a developer, I want product customization to be modeled as product-owned data, so that the domain model matches the admin and storefront workflow.
29. As a developer, I want obsolete template/revision lifecycle concepts removed from the product-owned customization path, so that future work does not maintain two competing models.
30. As a developer, I want canvas dimensions stored with product customization, so that rendering can validate and interpret ratio-based layer geometry without storing background assets.
31. As a developer, I want variant media linked to variants with explicit position, so that storefront and admin can reliably identify the default image.
32. As a developer, I want the full-create endpoint to return the created product with customization summary, so that admin navigation and flash messaging can use persisted backend data.
33. As a developer, I want storefront product data to include selected variant media and customization config when available, so that preview rendering does not require template lookup.
34. As a developer, I want local draft save to reject malformed customization JSON, so that broken editor documents are not persisted.
35. As a developer, I want product publish to reject incomplete customization readiness, so that invalid storefront states are impossible.

## Implementation Decisions

- Product customization is product-owned. Customization no longer has its own template lifecycle, revision lifecycle, draft status, or publish status.
- The standalone customization template and template revision model will be replaced for this flow by a one-to-one product customization model.
- A product can have at most one product customization config.
- Product customization stores editor rules, not independent background assets.
- Product customization stores `enabled`, canvas width, canvas height, layers JSON, form fields JSON, and timestamps.
- Product customization does not store `background` or background asset JSON. Background images are derived from variant media.
- Product status controls draft versus published behavior for customization.
- The product model gains an `is_customizable` concept, either as an explicit product field or as a product-level value that is kept consistent with the one-to-one customization row.
- Variant images for customizable products must all share the stored canvas dimensions.
- Canvas dimensions are derived from the first available variant image when customization is saved.
- The first media item for each variant is that variant's default customization preview background.
- Variant media needs a stable position field so media ordering survives persistence and reload.
- Variant media should be represented as a relationship between product variants and uploaded product assets rather than as embedded JSON.
- Admin create product uses a backend full-create endpoint rather than mock local state for this flow.
- The full-create endpoint accepts product details, organization data, attributes, options, variants, variant media, and optional product customization in one request.
- The full-create endpoint validates the entire payload and persists it as one product creation flow.
- Saving as draft allows incomplete customizable products so admins can return later.
- Publishing a customizable product requires publish readiness: every created variant has at least one image, all variant images share dimensions, and the customization editor model is valid.
- The Details tab owns the customization switch.
- The Customization tab appears only when customization is enabled and is placed after Variants.
- Navigating into Customization from Variants is blocked until each created variant has at least one image and the uploaded images satisfy the size contract for customization.
- The Variants tab shows contextual errors and guidance for missing images and dimension mismatches.
- The Customization tab embeds the full customization editor experience.
- In create product, editor-level save, publish, template, and revision controls are removed or disabled because persistence belongs to the product flow.
- The editor Background panel becomes a variant-image preview selector for admins rather than a background upload or persisted background selector.
- Storefront rendering uses the selected variant's first image as the customization preview background.
- Storefront does not expose a separate background picker inside the customization form.
- Existing domain decisions in the product-owned customization ADR should be treated as governing constraints.

## Testing Decisions

- Tests should assert external behavior at the highest useful seam rather than internal component state. The most important seam is the backend full-create product API because it owns product creation, variant media relationships, canvas dimensions, product customization persistence, and publish readiness.
- Backend tests should cover full-create draft success with incomplete customization, publish rejection for missing variant images, publish rejection for dimension mismatch, publish success with valid variant media and customization config, omitted customization when the switch is off, and stable variant media ordering.
- Shared customization package tests should cover validation of product-owned editor models without relying on template status or revision state.
- Admin tests should cover visible workflow behavior: switch shows the Customization tab, tab navigation is blocked until variant media is ready, dimension guidance appears, the editor can switch preview backgrounds from variant media, and create product submit sends product-owned customization data.
- Storefront tests should cover selected variant background behavior: changing variant changes the customization preview background while preserving layer placement.
- Existing build/typecheck seams remain required verification: backend check/build, admin build, storefront typecheck/build, customization package tests, and the root init script.
- Prior art exists in the repository around customization validation, editor model tests, backend product route validation, and admin build verification. New tests should extend those seams rather than testing implementation details of individual UI helpers.

## Out of Scope

- A separate customization template listing and template editor lifecycle for product-owned customization.
- Independent customization draft/publish/revision history.
- Shopper-facing background selection separate from variant selection.
- Automatic image resizing, cropping, or normalization to fix dimension mismatches.
- Long-term migration compatibility for deprecated template/revision paths beyond what is needed in dev mode.
- New product-level revision workflow for editing a published product without immediately changing its live customization.
- Production export jobs, font asset hardening, and deployment wiring not directly required for create product customization.
- Reworking unrelated admin product detail flows unless necessary to keep product-owned customization reload/edit coherent.

## Further Notes

The domain glossary defines Customizable Product, Customization Template, Embedded Product Customization, Background Choice, Selected Variant Background, Customization-Ready Variant, Background Size Contract, and Customization Publish Readiness. The product-owned customization ADR records the architectural decision to replace standalone template/revision lifecycle with one-to-one product customization.

The issue tracker was not configured in this repo and the GitHub CLI was not available in the current environment, so this PRD is published as a local markdown issue with the `ready-for-agent` label.
