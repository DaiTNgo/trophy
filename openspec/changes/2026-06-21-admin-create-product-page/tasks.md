1. Update the create product route spec to use a Medusa-like three-tab workflow with fixed footer actions.
2. Define `Details` tab behavior for core product fields, media, project-specific attributes, the variant toggle, and product-option authoring with option titles and values.
3. Define `Organize` tab behavior for thin-scope catalog metadata such as collection and categories, while keeping any secondary metadata optional and non-blocking.
4. Define `Variants` tab behavior as a variant-row editor for title, SKU, inventory quantity, optional backorder behavior, prices, and variant-specific uploaded media rather than a preview-card summary.
5. Define the variant-media purpose explicitly: media attached to a variant must support shopper preview of the exact variant selection and must remain separate from product-level media.
6. Add validation rules for minimal draft creation, default variant fallback, option/value validity when variants are enabled, and publish blocking at the variants step.
7. Update the mock-first create contract so option definitions and generated variant rows follow the Medusa-thin workflow without shipping-profile, sales-channel, or inventory-kit fields, while supporting variant media references per row.
