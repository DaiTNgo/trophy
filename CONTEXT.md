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

**Contact Price Variant Selection**:
The rule that a variant with Contact Price remains a valid storefront selection and can be chosen by auto-reselection. Contact Price changes the shopper call to action, not whether the variant is selectable.
_Avoid_: unselectable quote variant, skip contact-price variant

**Contact Price CTA Precedence**:
The storefront rule that Contact Price determines the primary call to action before inventory and backorder states. A selected Contact Price variant shows the contact/inquiry action labeled "Contact for price" as primary even if inventory is zero; stock context may be shown separately.
_Avoid_: out-of-stock quote CTA, add-to-cart contact price

**Contact Price Inquiry**:
A shopper contact flow for products or variants without a public price. Clicking "Contact for price" opens this inquiry flow and captures the selected product, variant, option labels/values, any customization values the shopper has entered, and shopper contact details. It does not create a cart line, checkout item, order, or order draft because an order requires a price snapshot and total, and it does not require checkout-ready customization.
_Avoid_: zero-price order, draft checkout, unpriced order

**Inquiry-Ready Variant Selection**:
The storefront condition for starting a Contact Price inquiry: the shopper must have a valid selected variant so the inquiry can capture a variant ID and option snapshot. If the current selection is invalid, storefront auto-reselection should choose a valid variant first; if no valid variant exists, the inquiry action is disabled.
_Avoid_: product-only inquiry, inquiry for missing variant

**Admin Product Catalog**:
The operator-facing product list used for catalog management. It may include draft, published, and archived products with fields needed for administration rather than shopper browsing.
_Avoid_: storefront catalog, public product list

**Admin Product Detail**:
The operator-facing product management page for one product, backed by the admin route surface as the source of truth after creation.
_Avoid_: local product detail, mock product editor

**Storefront Locale**:
The shopper-facing language context used to choose localized catalog content. Trophy supports Vietnamese and English storefront locales while prices remain VND-only.
_Avoid_: country, market, currency

**Default Catalog Locale**:
The Vietnamese catalog content used as the canonical fallback when a localized English value is not available during editing or migration. It is not a separate market and does not imply a different price.
_Avoid_: source country, base currency locale

**Localized Catalog Content**:
Shopper-facing catalog text that can have Vietnamese and English values, such as product titles, subtitles, descriptions, option titles, option value labels, category names, collection titles, attributes, and customization form labels.
_Avoid_: translated product record, language-specific product

**Catalog Translation Completeness**:
The readiness state describing whether localized catalog content satisfies the field-specific publish rules. Product title requires Vietnamese (`vi`) only; English (`en`) product title is optional. Product subtitle and description are optional in both locales and do not block draft or publish. Other shopper-facing localized fields may require both Vietnamese and English when their active feature spec says so. Completeness affects admin warnings and publish readiness, but it does not create separate products, variants, or prices.
_Avoid_: market readiness, currency readiness

**Canonical Catalog Identity**:
The language-neutral identity of a catalog record, such as a product, option, option value, category, collection, or variant. Translations change display labels but must not change the identity used by variants, links, orders, or customization snapshots.
_Avoid_: translated ID, language-specific variant

**Product Option Definition**:
An admin-defined variation axis for a product, such as color or size, whose values can be selected by product variants.
_Avoid_: Medusa option model, variant category

**Default Product Option**:
The product option automatically created for a product that does not have operator-defined variation axes. In the domain model it is equivalent to an operator enabling variants and defining one option titled "Default option" with one value "Default option value"; it is real option data shown in admin product detail and available to storefront variant-selection logic.
_Avoid_: hidden option, variantless product

**Product Option Rename**:
An edit to the title of an existing product option, including the default product option. Renaming "Default option" does not convert the product into a different product mode; it edits the same option record.
_Avoid_: convert simple product, replace option on rename

**Product Option Value Edit**:
An edit to the label of an existing product option value. The option value's identity remains the same, so variants already using it continue to point at the same value and display the renamed label.
_Avoid_: replace option value for rename, delete-and-recreate for label changes

**Product Option Value Deletion**:
An operator action that removes an option value even if product variants currently use it. Affected variants must be reconciled by assigning another value for that option or by removing the variant.
_Avoid_: block used value deletion, require value to be unused before deletion

**Unreconciled Variant Option**:
A temporary variant state caused by deleting an option value that the variant used. The variant may remain saved while the operator continues editing, and admin variants tables show the affected option as "Missing value". It blocks new product publish attempts; if already-published catalog data later contains an unreconciled variant, storefront keeps the product visible but disables option selections that cannot resolve to a valid variant.
_Avoid_: forced replacement flow, hiding the whole product

**Variant Option Publish Readiness**:
The product-level publish condition that every variant must have exactly one valid value for every current product option. If any variant has an unreconciled variant option, the whole product cannot be published.
_Avoid_: publish valid variants only, partial variant publication

**Disabled Storefront Option Selection**:
A shopper-facing option value in the current selection context that remains visible but cannot be selected because choosing it with the already selected option values would not resolve to a valid purchasable variant. Availability is evaluated by combination, not by globally hiding or disabling the option value everywhere.
_Avoid_: hidden unavailable option, broken option click

**Storefront Purchase Availability**:
The shopper-facing state that determines whether the selected valid variant can be purchased immediately. Inventory and backorder settings affect the call to action, but they do not make an existing option combination invalid or unselectable.
_Avoid_: disable option by stock, hide out-of-stock variant

**Out of Stock CTA**:
The storefront call to action for a selected valid variant with zero inventory and backorders disabled. The option combination remains selected, but the purchase button is disabled and labeled "Out of stock".
_Avoid_: unavailable option, missing variant

**Backorder CTA**:
The storefront call to action for a selected valid variant with zero inventory and backorders enabled. The variant remains purchasable; until a dedicated backorder flow exists, the primary button remains "Add to cart" with backorder context shown separately.
_Avoid_: out-of-stock backorder, disable backorder purchase

**Storefront Variant Auto-Reselection**:
The storefront behavior that moves the shopper to the first valid purchasable variant when the current option selection does not resolve to a valid variant, including initial product load and selection changes that invalidate the previous combination. "First" is determined by variant position, then variant ID as a stable tie-breaker.
_Avoid_: dead variant selection, require shopper recovery

**Default Option Value Preservation**:
The rule that a product's default option/value remains part of the option model when real product options are added later, matching Medusa Admin behavior. Existing variants receive a default value for newly introduced options until the operator edits them.
_Avoid_: replace default option, discard simple-product option

**Default Option Auto-Selection**:
The storefront behavior for a product whose only selectable option path is "Default option" / "Default option value": the option is treated as real product data but may be selected automatically so shoppers are not forced to click a meaningless single choice before purchase.
_Avoid_: hidden default option, required default click

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
The customization-admin workflow for defining colors and uploading font families used by customization templates. It sits under Customization rather than as a top-level admin domain.
_Avoid_: public font API, storefront brand editing

**Brand Asset Runtime**:
The shopper-safe read model of brand colors and font families needed to render storefront customization experiences.
_Avoid_: brand asset management, public upload API

**Customization Clipart Library**:
The admin-managed library of reusable clipart used by customization templates. It belongs to the customization domain rather than brand identity assets.
_Avoid_: brand assets, global icon assets, public icon marketplace

**Clipart Category**:
An admin-managed grouping that owns clipart icons for customization, such as a sport, badge family, frame set, or decorative emblem group. It can be ordered for browsing and deactivated instead of hard-deleted when existing icons or templates depend on it.
_Avoid_: tag, free-form category text, product category

**Clipart Asset**:
A reusable curated media asset that belongs to exactly one clipart category and may be selected inside a customization form. It can be an SVG, PNG, or WebP asset, has both a source filename and an admin-facing display name, differs from a shopper-uploaded image, and is hidden from new shopper sessions when deactivated.
_Avoid_: clipart icon, customization icon asset, uploaded logo, product image, UI icon, taggable icon

**Clipart Choice Field**:
A shopper customization field where the shopper selects one clipart asset from the admin-approved choices for that product layer. The selected clipart asset becomes part of the order customization snapshot.
_Avoid_: fixed clipart asset, file upload, free icon search, variant option

**Layer Clipart Allowlist**:
The product customization layer's approved subset of clipart assets from one clipart category. Shoppers see only active assets in this allowlist, and publish readiness fails when the allowlist has no active assets for a clipart-choice layer.
_Avoid_: whole category selection, global icon library, shopper icon search

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

**Shopper Text Field**:
A text customization field that a shopper fills for one customizable product, such as a winner name, team name, year, inscription, or award message. It is defined by an admin-owned text layer and form field, then captured as shopper-entered order item data.
_Avoid_: product title, catalog text, freeform note

**Text Style Policy**:
The admin-defined rule for what a shopper may change on a shopper text field, including whether color, font family, bold, italic, underline, and alignment are fixed or shopper-selectable. It controls shopper formatting choices without giving the shopper control over layer geometry.
_Avoid_: rich text editor, unrestricted formatting

**Text Fit Rule**:
The admin-defined boundary for rendering shopper text inside its assigned product area, including max lines, min/max font size, path behavior, and overflow handling. It protects production layout when shopper-entered text is longer than the visual area can support.
_Avoid_: manual font size, free resize, layout suggestion

**Text Content Constraint**:
The admin-defined input rule for shopper text, such as required state, line-count capacity, whitespace behavior, or allowed character set. It limits what the shopper can submit before rendering and production export, while text size is handled by fit rules instead of character-count limits.
_Avoid_: validation error copy, typography setting

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

**Cart Line**:
A shopper-side pending purchase choice before checkout, containing the selected product, variant, quantity, and any shopper-entered customization values. It is not trusted for product title, SKU, price, or production snapshot data.
_Avoid_: cart product snapshot, client order item, trusted cart item

**Checkout-Ready Cart Line**:
A cart line that has a concrete variant, a positive quantity, and all required customization values for customizable products. Checkout submits only checkout-ready cart lines to order creation.
_Avoid_: incomplete cart item, draft order item, partially customized cart line

**Cart Line Merge**:
The storefront rule for combining shopper selections in the browser cart. Non-customized selections merge by product and variant, while customized selections merge only when product, variant, and customization values are identical.
_Avoid_: always merge by SKU, never merge customized items, merge by product only

**Different Shipping Address**:
A checkout choice where the recipient and delivery address differ from the shopper's primary contact details. It keeps order contact information separate from fulfillment delivery information.
_Avoid_: alternate customer, second billing profile, address note

**Order Address Snapshot**:
The immutable checkout address record captured with an order, including the shopper's primary address and any different shipping address supplied for fulfillment.
_Avoid_: resolved address only, mutable customer address

**Order Number**:
The shopper-facing identifier returned after order creation and shown on confirmation pages and admin order lists. It is distinct from the internal database ID.
_Avoid_: order ID, database ID, confirmation token

**Storefront Order Lookup**:
A shopper-facing order retrieval flow that requires both the order number and the customer's phone number. It returns only shopper-safe order summary data, not internal production snapshots.
_Avoid_: public order detail by number, admin order lookup, unauthenticated order detail

**Manual Payment Order**:
An order created without an online payment gateway or shopper-selected payment step. The storefront submits customer and delivery information, then operators handle payment and order follow-up manually after creation.
_Avoid_: online checkout payment, gateway transaction, shopper payment method

**Order Item Production Status**:
The production readiness state tracked per order item. Non-customized items do not require production review, while customized items start pending operator review before production work begins.
_Avoid_: order status, fulfillment status, customization status

**Admin Draft Discard Guard**:
A confirmation prompt shown when closing a create-product creation modal, preventing accidental data loss by requiring the operator to confirm discard before the modal closes. It covers the Escape key, backdrop click, Cancel button, and browser back. Does not appear after a successful submission.
_Avoid_: unsaved changes warning, dirty form guard, close protection
