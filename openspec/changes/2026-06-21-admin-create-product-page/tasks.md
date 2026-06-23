1. Update the create product route spec to use a Medusa-like three-tab workflow with fixed footer actions.
2. Define `Details` tab behavior for core product fields, media, the variant toggle, and product-option authoring with option titles and values.
3. Define `Organize` tab behavior for catalog metadata such as discountable, type, collection, categories, tags, shipping profile, and sales channels.
4. Define `Variants` tab behavior as a variant-row editor for title, SKU, inventory flags, and prices rather than a preview-card summary.
5. Add validation rules for minimal draft creation, default variant fallback, option/value validity when variants are enabled, and publish blocking at the variants step.
6. Update the mock-first create contract so option definitions and generated variant rows follow the Medusa-aligned workflow.
