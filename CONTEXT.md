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

**Contact Price Inquiry**:
A shopper contact flow for products or variants without a public price. It is separate from order creation because an order requires a price snapshot and total.
_Avoid_: zero-price order, draft checkout, unpriced order

**Admin Product Catalog**:
The operator-facing product list used for catalog management. It may include draft, published, and archived products with fields needed for administration rather than shopper browsing.
_Avoid_: storefront catalog, public product list

**Admin Product Detail**:
The operator-facing product management page for one product, backed by the admin route surface as the source of truth after creation.
_Avoid_: local product detail, mock product editor

**Product Option Definition**:
An admin-defined variation axis for a product, such as color or size, whose values can be selected by product variants.
_Avoid_: Medusa option model, variant category

**Product Variant**:
A purchasable product row representing one concrete option selection, with its own title, SKU, price, inventory, backorder setting, and variant media.
_Avoid_: generated option combination, Medusa variant model

**Variant Management Action**:
An explicit operator action that changes one part of variant-related data, such as option values, variant details, prices, stock, or media, without replacing unrelated variant state.
_Avoid_: full variant replace, regenerate variants

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

**Order**:
A shopper's checkout submission containing customer details and one or more purchased items. Each item is captured with its own immutable order item snapshot.
_Avoid_: single-product purchase, transaction, cart

**Order Item Snapshot**:
The immutable product, variant, price, and customization record captured for a single order item at the time the shopper places the order. It preserves what the shopper bought even if the product catalog or customization template changes later.
_Avoid_: live product reference, cart item reference, mutable order item

**Order Price Snapshot**:
The product variant price captured by the backend at the moment a shopper requests order creation. Shopper-submitted prices are not part of the ordering contract.
_Avoid_: cart price, client price, displayed price

**Order Customization Snapshot**:
The immutable customization record captured for a customizable order item, including shopper-entered values, the rendered design, and the template/background context needed to reproduce production artwork later.
_Avoid_: customization form submission, live template render, preview state

**Customization Required Item**:
An order item for a customizable product, where shopper customization values are required before the item can be accepted into an order.
_Avoid_: optional customized item, best-effort customization

**Order Item Selection**:
The shopper's product choice for an order item, identified by product ID and variant ID. The variant is the priced purchasable unit and determines the selected product background for customization.
_Avoid_: handle selection, option-only selection, SKU-only selection

**Different Shipping Address**:
A checkout choice where the recipient and delivery address differ from the shopper's primary contact details. It keeps order contact information separate from fulfillment delivery information.
_Avoid_: alternate customer, second billing profile, address note

**Order Address Snapshot**:
The immutable checkout address record captured with an order, including the shopper's primary address and any different shipping address supplied for fulfillment.
_Avoid_: resolved address only, mutable customer address

**Order Number**:
The shopper-facing identifier returned after order creation and shown on confirmation pages and admin order lists. It is distinct from the internal database ID.
_Avoid_: order ID, database ID, confirmation token

**Manual Payment Order**:
An order created without an online payment gateway, where payment is confirmed manually by bank transfer or collected when the product is delivered. Production or fulfillment may wait for an operator to mark the payment or order as ready.
_Avoid_: online checkout payment, gateway transaction, auto-captured payment

**Order Item Production Status**:
The production readiness state tracked per order item. Non-customized items do not require production review, while customized items start pending operator review before production work begins.
_Avoid_: order status, fulfillment status, customization status

**Admin Draft Discard Guard**:
A confirmation prompt shown when closing a create-product creation modal, preventing accidental data loss by requiring the operator to confirm discard before the modal closes. It covers the Escape key, backdrop click, Cancel button, and browser back. Does not appear after a successful submission.
_Avoid_: unsaved changes warning, dirty form guard, close protection
