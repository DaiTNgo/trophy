# Product-Owned Customization

Customization configuration belongs to the product lifecycle, not to a separate template lifecycle. We will replace the standalone `customization_templates` and `customization_template_revisions` model with a one-to-one `product_customizations` model so product creation, draft state, publishing, and customization editor data are saved together as one product-owned configuration.

**Consequences**

`product_customizations` stores the current editor model and canvas size for a product, while product status determines whether the customization is draft or published. Background images are derived from product variant images rather than persisted as separate customization assets, and all variant images for a customizable product must match the stored canvas size. Separate template save, publish, and revision flows are out of scope unless product-level draft revisioning is introduced later.
