# Trophy Context

Trophy is an ecommerce system for selling trophy products, including products that can be personalized before purchase.

## Language

**Customizable Product**:
A product whose shopper-facing purchase flow includes a structured customization experience based on an admin-defined template.
_Avoid_: customization trophy, customized product type

**Storefront Product Listing**:
The public product list shown to shoppers. It includes only products available for browsing and buying, not draft or operator-only catalog records.
_Avoid_: admin catalog, product admin list

**Storefront Product Search**:
A filtered storefront product listing driven by a shopper's text query. It searches published product browsing fields and remains part of the storefront product listing API until search spans non-product content.
_Avoid_: separate product search service, admin search

**Contact Price**:
A storefront product price state where no variant has a public price amount, so the shopper is prompted to contact the business instead of seeing a numeric price.
_Avoid_: missing price, price error

**Admin Product Catalog**:
The operator-facing product list used for catalog management. It may include draft, published, and archived products with fields needed for administration rather than shopper browsing.
_Avoid_: storefront catalog, public product list

**Shop by Product**:
A flat storefront browsing group based on the physical product kind shoppers want to buy, such as trophies, medals, plaques, or cups. It is modeled with product categories and is not a nested category tree.
_Avoid_: product type, category hierarchy, internal type

**Shop by Interest**:
A storefront browsing group based on the shopper's occasion, audience, sport, industry, or buying intent. It is modeled with product collections rather than categories.
_Avoid_: product category, product type, tag group

**Admin Route Surface**:
The operator-facing backend route surface used by the admin app for management workflows. It owns admin-only catalog, customization, asset, account, draft, and publish interactions.
_Avoid_: generic product API, internal product routes

**Storefront Route Surface**:
The shopper-facing backend route surface used by the storefront app for public browsing and purchase flows. It exposes only customer-safe published data and shopper runtime interactions.
_Avoid_: public admin API, shared product routes

**Brand Asset Management**:
The admin-only workflow for defining brand colors and uploading font families used by customization templates.
_Avoid_: public font API, storefront brand editing

**Brand Asset Runtime**:
The shopper-safe read model of brand colors and font families needed to render storefront customization experiences.
_Avoid_: brand asset management, public upload API

**Customization Template**:
The admin-defined configuration for a customizable product, including editable layers, form fields, and visual placement rules. Its background images are derived from the product's variant images rather than stored as independent customization data.
_Avoid_: customization config, editor setup

**Embedded Product Customization**:
A customization template edited inside the product creation flow and saved through the product's lifecycle rather than through a separate template draft or publish workflow. It stores customization rules, not separate background assets.
_Avoid_: standalone template, separate customization publish

**Background Choice**:
A product image option used by admins as the fixed canvas behind a customization template while designing and checking layer placement. Background choices for the same template must share the same pixel dimensions so layer positions render consistently.
_Avoid_: shopper background choice, preview image

**Default Background Choice**:
The background choice initially selected for a customizable product. By default, this is the first image from the product's created variants.
_Avoid_: primary image, fallback background

**Selected Variant Background**:
The background image used in the shopper-facing customization preview. It comes from the product variant currently selected by the shopper, not from a separate customization background picker.
_Avoid_: shopper-selected background, customization background option

**Customization-Ready Variant**:
A product variant that can support shopper-facing customization because it has at least one background image.
_Avoid_: valid variant, completed variant

**Background Size Contract**:
The rule that all variant images for a customizable product must have identical pixel width and height, allowing one customization template to render consistently across every variant background.
_Avoid_: same-size warning, image dimension hint

**Customization Publish Readiness**:
The product-level condition that a customizable product must satisfy before it can be published, including complete variant backgrounds, matching image dimensions, and a valid customization editor model.
_Avoid_: template publish validation, customization status
