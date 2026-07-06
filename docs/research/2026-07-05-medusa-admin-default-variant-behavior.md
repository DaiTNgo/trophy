# Medusa Admin Default Option / Variant Behavior

Scope: explain why Medusa Admin shows `Default option`, `Default option value`, and `Default variant` after product creation, whether Medusa requires at least one variant, and what Trophy should mirror in its own product model.

Consulted Medusa sources on 2026-07-05:
- Medusa docs v2.16 user guide and API reference.
- Medusa source from `medusajs/medusa` `develop` snapshot at commit `6d162226` (shallow clone taken on 2026-07-05).

## Findings

1. Medusa Admin is pre-seeding a default option/value/variant in the create form.
- The product-create form schema requires at least one option and at least one variant: `options: z.array(...).min(1)` and `variants: z.array(...).min(1)`.
- The default form state hardcodes `Default option`, `Default option value`, and `Default variant`.
- When the user disables variants in the UI, the handler calls `createDefaultOptionAndVariant()` and writes the same default option/value/variant back into the form.
- Source: [Medusa Admin product-create constants](https://github.com/medusajs/medusa/blob/6d162226/packages/admin/dashboard/src/routes/products/product-create/constants.ts#L123-L147), [Medusa Admin variant-section handler](https://github.com/medusajs/medusa/blob/6d162226/packages/admin/dashboard/src/routes/products/product-create/components/product-create-details-form/components/product-create-details-variant-section/product-create-details-variant-section.tsx#L408-L429).

2. The product detail page is not inventing those labels later.
- The detail page simply loads the product and renders `ProductOptionSection` and `ProductVariantSection` from `product.options` and `product.variants`.
- So if the create flow persisted the defaults, the detail page will faithfully display them.
- Source: [Medusa Admin product detail page](https://github.com/medusajs/medusa/blob/6d162226/packages/admin/dashboard/src/routes/products/product-detail/product-detail.tsx#L48-L68), [Medusa Admin option section](https://github.com/medusajs/medusa/blob/6d162226/packages/admin/dashboard/src/routes/products/product-detail/components/product-option-section/product-option-section.tsx#L36-L79), [Medusa Admin variant section](https://github.com/medusajs/medusa/blob/6d162226/packages/admin/dashboard/src/routes/products/product-detail/components/product-variant-section/product-variant-section.tsx#L44-L80).

3. Medusa’s product model is variant-driven, and options are the inputs that generate variants.
- The Product Module overview says products have custom options and each variant sets the value for those options.
- The create-product docs say that after adding options, product variants are created automatically, and the user can uncheck a checkbox to disable a particular variant.
- The variants guide says you can only create a variant if there are option combinations that do not already exist as a variant.
- Sources: [Product Module overview](https://docs.medusajs.com/resources/commerce-modules/product), [Create Product in Medusa Admin](https://docs.medusajs.com/user-guide/products/create), [Manage Product Variants in Medusa Admin](https://docs.medusajs.com/user-guide/products/variants).

4. The admin API contract does not hard-require variants the way the Admin UI does.
- The admin create-product validator marks both `options` and `variants` as optional in the request payload.
- The create workflow still validates that options exist, but it does not add a global rule that every product payload must include a variant.
- That means the strong “must have a variant” rule is an Admin authoring convention, not a universal backend invariant at the POST validator layer.
- Sources: [Admin create-product validator](https://github.com/medusajs/medusa/blob/6d162226/packages/medusa/src/api/admin/products/validators.ts#L236-L276), [createProductsWorkflow validation](https://github.com/medusajs/medusa/blob/6d162226/packages/core/core-flows/src/product/workflows/create-products.ts#L37-L90).

5. Medusa’s “Default Value” behavior is historical and workflow-level, not a product concept you need to expose verbatim.
- A Medusa maintainer discussion shows that when an option is added to an existing product, existing variants get `"Default Value"` for that new option via `ProductService.addOption`.
- That discussion explains the same pattern behind the confusing default labels in older product flows.
- Source: [Medusa discussion #6317](https://github.com/medusajs/medusa/discussions/6317).

## What Trophy Should Mirror

Rank 1. Mirror the invariant, not the literal wording.
- Trophy should keep a single internal default variant when variant mode is disabled, because that matches the current Trophy catalog direction and avoids a special “variantless product” branch.
- Trophy should not have to expose Medusa’s literal `Default option` / `Default option value` strings to operators if those labels are confusing; they are seed values, not domain language.
- This is the best fit for the repo’s own catalog design, which already says: when variant mode is disabled, “create one default variant automatically.”
- Sources: [Medusa-thin product catalog design](/Users/dnt/workspace/trophy/docs/plans/2026-06-23-medusa-thin-product-catalog-design.md), [simplify-product-organization proposal](/Users/dnt/workspace/trophy/openspec/changes/simplify-product-organization/proposal.md)

Rank 2. Keep Medusa-style product options + generated variants for real variant products.
- This preserves the Medusa mental model for size/color-style products.
- Trade-off: more model/UI complexity, but it stays aligned with Medusa docs and source.
- Sources: [Product Module overview](https://docs.medusajs.com/resources/commerce-modules/product), [Create Product in Medusa Admin](https://docs.medusajs.com/user-guide/products/create).

Rank 3. Model a true simple product with no internal variant fallback.
- This is the simplest conceptually, but it diverges from Medusa Admin behavior and from Trophy’s current thin-catalog design.
- Adoption risk is higher because it creates a second product mode the admin UX has to explain and maintain.

## Trade-offs

| Option | Fit for Trophy | Complexity | Risk |
|---|---|---:|---:|
| Internal default variant, hidden seed labels | Best | Low | Low |
| Medusa-style visible default labels | Good if parity matters more than clarity | Low | Low |
| No fallback variant | Weak for current catalog direction | Low | Medium-high |

## Bottom Line

Medusa Admin shows `Default option` / `Default option value` / `Default variant` because the create form seeds them and the detail page simply renders what was saved. Medusa’s UI expects at least one option and one variant during authoring, but the backend create validator itself does not make `variants` a universal hard requirement. For Trophy, the right thing to mirror is the **single default-variant invariant** for variant-disabled products, not necessarily Medusa’s literal placeholder strings.

## Uncertainty

- I did not find a Medusa docs page that states, in one sentence, “every product must always have at least one variant” as a backend invariant.
- The strongest evidence for that rule is in the Admin UI create schema and form defaults, not the API validator.
- Medusa docs consulted are v2.16; source was the `develop` snapshot at commit `6d162226` on 2026-07-05. If Medusa changes the create flow after that point, the UI labels may move.

## Sources

- [Medusa Product Module overview](https://docs.medusajs.com/resources/commerce-modules/product)
- [Create Product in Medusa Admin](https://docs.medusajs.com/user-guide/products/create)
- [Manage Product Variants in Medusa Admin](https://docs.medusajs.com/user-guide/products/variants)
- [Manage Product Options in Medusa Admin](https://docs.medusajs.com/user-guide/products/options)
- [Medusa Admin API Reference](https://docs.medusajs.com/api/admin)
- [Medusa discussion #6317](https://github.com/medusajs/medusa/discussions/6317)
- [Medusa Admin product-create constants](https://github.com/medusajs/medusa/blob/6d162226/packages/admin/dashboard/src/routes/products/product-create/constants.ts#L123-L147)
- [Medusa Admin product-create variant section](https://github.com/medusajs/medusa/blob/6d162226/packages/admin/dashboard/src/routes/products/product-create/components/product-create-details-form/components/product-create-details-variant-section/product-create-details-variant-section.tsx#L408-L429)
- [Medusa Admin product detail page](https://github.com/medusajs/medusa/blob/6d162226/packages/admin/dashboard/src/routes/products/product-detail/product-detail.tsx#L48-L68)
- [Medusa Admin product validator](https://github.com/medusajs/medusa/blob/6d162226/packages/medusa/src/api/admin/products/validators.ts#L236-L276)
- [createProductsWorkflow](https://github.com/medusajs/medusa/blob/6d162226/packages/core/core-flows/src/product/workflows/create-products.ts#L37-L90)
