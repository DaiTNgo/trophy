# Product-Owned Customization

Customization configuration belongs to the product lifecycle, not to a separate template lifecycle. We will replace the standalone `customization_templates` and `customization_template_revisions` model with a one-to-one `product_customizations` model so product creation, draft state, publishing, and customization editor data are saved together as one product-owned configuration.

**Consequences**

`product_customizations` stores the current editor model and canvas size for a product, while product status determines whether the customization is draft or published. Variant-owned Customization Media supplies the canvas for each variant; Gallery Media remains a separate reference collection. See ADR 0003 for the media ownership and dimension rules. Separate template save, publish, and revision flows are out of scope unless product-level draft revisioning is introduced later.
