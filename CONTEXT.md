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

**Product Trash**:
The admin-only collection of products removed from the active Admin Product Catalog by a soft delete. A product in Product Trash is unavailable to shoppers and remains recoverable until it is permanently deleted.
_Avoid_: archive, deleted product list, inactive catalog

**Product Restoration**:
The operator action that removes a Product from Product Trash and returns it to the Admin Product Catalog as a draft. Restoration never republishes a product automatically.
_Avoid_: undelete to published, reactivate product

**Permanent Product Deletion**:
The irreversible removal of a Product from Product Trash, including its remaining catalog data. It is independent of Order Item Snapshots, which retain the historical purchase record without reading the removed catalog product or variant.
_Avoid_: order-blocked product deletion, catalog archive

**Product Trash MISA Retention**:
The rule that soft-deleting a Product retains its MISA Product Records. MISA cleanup occurs only when an operator permanently deletes the Product from Product Trash.
_Avoid_: soft-delete MISA cleanup, restore-time MISA sync

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

**MISA Product Record**:
The external MISA product corresponding to exactly one Trophy Product Variant. Its stable `product_code` is the Trophy variant ID, while its `product_name` is the localized Vietnamese product title followed by the variant title, separated by ` - `. It always uses `usage_unit` "Cái", `product_properties` "Hàng hóa", and `form_layout` "Mẫu tiêu chuẩn". A Trophy SKU is operational catalog data and does not identify the MISA Product Record. MISA failure never prevents Trophy from saving or publishing its product; each Product Variant independently records whether its MISA Product Record has been created.
_Avoid_: SKU-backed MISA product, product-level MISA record

**Variant MISA Sync Status**:
The independently persisted MISA synchronization state of a Product Variant: `pending` means it has not yet been created in MISA or needs synchronization, `synced` means its MISA Product Record is known to exist, and `failed` means its most recent MISA operation failed. Each variant also stores its MISA product ID, last MISA error, and most recent successful synchronization time. It is distinct from product publication and order synchronization.
_Avoid_: product MISA status, order MISA status, published status

**MISA Product Sync Trigger**:
Trophy attempts MISA product synchronization when an operator creates a product as published, changes a product from draft to published, adds a variant to an already published product, or changes a product or variant name on an already published product. Saving a draft does not call MISA. A MISA error does not reverse the local Trophy save or publish and is recorded per affected Product Variant.
_Avoid_: draft MISA sync, MISA-gated publish

**Variant MISA Name Update**:
When a product title or variant title changes, Trophy updates the existing MISA Product Record with MISA `PUT /Products`, identified by the stable variant-ID `product_code`. It does not create a replacement record or use the Trophy SKU for this update.
_Avoid_: delete-and-recreate MISA product, SKU-based MISA update

**Variant MISA Deletion**:
The local removal of a Product Variant or permanent removal of a Product is the authoritative catalog outcome. If it owns synchronized MISA Product Records, Trophy commits the local deletion and a durable MISA Deletion Job together; remote deletion is retried asynchronously and does not reverse or block the catalog outcome.
_Avoid_: synchronous MISA-gated deletion, rollback catalog deletion for MISA

**MISA Deletion Job**:
Durable work to remove one MISA Product Record after its owning Trophy catalog record has been permanently removed. A job records retry state and the most recent error. It is distinct from MISA Synchronization State, which applies only to an extant Product Variant.
_Avoid_: pending variant sync, remote-delete request
_Avoid_: post-delete order check, local-first MISA deletion

**Variant Management Action**:
An explicit operator action that changes one part of variant-related data, such as option values, variant details, prices, stock, or media, without replacing unrelated variant state.
_Avoid_: full variant replace, regenerate variants

**Variant Media Management**:
The independent operator workflow for a persisted Product Variant's Gallery Media and Customization Background. Upload immediately creates and attaches an asset; removal immediately detaches and deletes its asset. It is separate from saving Variant Details, and closing or cancelling Variant Details does not roll back completed media actions.
_Avoid_: pending variant media, media saved with variant details, variant-media rollback on cancel

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
The admin-defined configuration for a customizable product, including editable layers, form fields, and visual placement rules. Its background choices come from the variants' independently stored Customization Media rather than from Gallery Media.
_Avoid_: customization config, editor setup

**Embedded Product Customization**:
A customization template edited inside the product creation flow and saved through the product's lifecycle rather than through a separate template draft or publish workflow. It stores customization rules, not separate background assets.
_Avoid_: standalone template, separate customization publish

**Background Choice**:
A customization background selected by an admin for use as the fixed canvas while designing and checking a customization template. It is stored independently from a variant's Gallery Media; every variant of a published customizable product has exactly one Background Choice, and Background Choices for the same template share the same pixel dimensions.
_Avoid_: shopper background choice, preview image

**Default Background Choice**:
The Background Choice initially shown to an admin while editing a customization template. By default, it is the Customization Background of the first created variant.
_Avoid_: primary image, fallback background

**Selected Variant Background**:
The background image used in the shopper-facing customization preview. It comes from the product variant currently selected by the shopper, not from a separate customization background picker.
_Avoid_: shopper-selected background, customization background option

**Customization-Ready Variant**:
A product variant that can support shopper-facing customization because it has exactly one Customization Background.
_Avoid_: valid variant, completed variant

**Background Size Contract**:
The rule that all Customization Backgrounds for a customizable product declare identical canvas width and height, allowing one customization template to render consistently across every variant background. The admin client supplies and validates this canvas metadata before save; the backend only verifies that submitted and saved declarations agree.
_Avoid_: same-size warning, image dimension hint

**Declared Background Dimensions**:
The width and height metadata supplied by the admin client for a Customization Background. It is the canvas-size source of truth, including for PDF backgrounds; it is not media dimensions inferred or decoded by the backend.
_Avoid_: backend-derived canvas size, fixed PDF canvas size

**Customization Operation Lease**:
A short-lived, server-held reservation for a Product while activation, repair, or reactivation is in progress. It prevents conflicting Variant changes until the lifecycle operation commits or the reservation expires after an interrupted request.
_Avoid_: permanent product lock, browser-tab lock, revision timestamp

**Customization Background**:
The one independently uploaded asset owned by a variant and explicitly designated as its Background Choice for shopper customization. It is not Gallery Media, cannot be shared with another variant, and only Customization Backgrounds are subject to the Background Size Contract. It has no delete action; an operator can only replace it after client-side and authoritative server-side dimension validation succeeds.
_Avoid_: gallery image, all variant media, upload background

**Variant Media**:
Media owned by exactly one product variant and shown for that variant. New items append in the operator's selected-file order. It can be selected as a Product Thumbnail without creating a second R2 object.
_Avoid_: product media upload, shared gallery file, customization background

**Product Thumbnail**:
The asset used to represent a product. On Product creation, it is initialized by referencing eligible media already owned by a created variant: either its Customization Background or Variant Media. After creation, an operator can explicitly select a Variant Media, Customization Background, or product-owned thumbnail asset. If the referenced asset is deleted or replaced, the thumbnail becomes empty and does not fall back to another asset.
_Avoid_: product gallery copy, perpetual automatic thumbnail fallback, variant default image

**Initial Product Thumbnail**:
The Product Thumbnail reference assigned once by the Create Product workflow from eligible media of created variants in their creation order. It reuses the existing asset and does not create another R2 object. For each variant, the source priority is its Customization Background, then its first Variant Media in gallery position order. It is not recalculated after Product creation. It is empty when no created variant has eligible media or when its best-effort initialization fails; that failure does not prevent Product creation.
_Avoid_: product-media upload, dynamic thumbnail fallback, copied variant asset

**Product Media**:
The thumbnail selection surface for one Product. Operators choose a Variant Media or Customization Background asset, or upload one product-owned thumbnail asset; references never duplicate the source R2 object. It is not a gallery and has no ordering.
_Avoid_: product gallery, copied variant media, product media URL list

**Product Media Carousel**:
The shopper-facing ordered image sequence for the selected variant: its Customization Media first, followed by that variant's Gallery Media in gallery position order. Next/Previous navigation changes the visible image within this sequence and does not change the selected variant.
_Avoid_: variant switcher, gallery-only carousel, customization canvas history

**Customization Preview Reset**:
The storefront behavior that returns the visible image to the selected variant's Customization Media whenever the shopper focuses or clicks the customization form. The reset changes the visible image only; it preserves the shopper's entered customization values.
_Avoid_: clear customization, reset form, replace gallery media

**Shopper Customization Draft**:
A browser-owned, pre-checkout customization of one cart line, including the shopper's entered values and any uploaded image. It is temporary and is not an Order Item Snapshot.
_Avoid_: order customization, purchased design, cart asset

**Order Customization Snapshot**:
The immutable customization data and shopper-uploaded media preserved for one created order item, so production can reproduce the purchased result after its draft and catalog state change.
_Avoid_: cart draft, live customization, product asset

**Abandoned Checkout Order**:
A created order that remains pending payment and unfulfilled, with no operational work started. It may be removed only through a deliberate admin purge.
_Avoid_: cancelled order, failed payment, order draft

**Order Cancellation**:
The irreversible operational closure of an order that preserves its record for reconciliation and history. Trophy has no administrator cancellation action while MISA is the operational system of record; any future cancellation flow must synchronize with MISA. A cancelled order is never eligible for Order Purge, which applies only to an Abandoned Checkout Order that is still pending.
_Avoid_: delete order, purge order, refund

**Order Purge**:
An explicit super-admin action that permanently removes an Abandoned Checkout Order and its dependent Trophy data. It never runs automatically. When a MISA SaleOrder exists, Trophy removes local data only after MISA confirms its deletion or reports that the record is already absent; an order that never created a MISA SaleOrder may be removed locally. It removes only the SaleOrder, never the customer's MISA Contact.
_Avoid_: automatic cleanup, cancel order, archive order

**Order Customization Background**:
The immutable copy of the selected variant's Customization Background stored only with an Order Item that has an Order Customization Snapshot. It is not a reference to the current catalog background.
_Avoid_: live variant background, product media reference, order preview fallback

**Order Clipart Snapshot**:
The immutable copy of a Clipart Asset selected by a shopper and stored with an Order Customization Snapshot. It allows the source Clipart Library asset to be permanently deleted without affecting a past order.
_Avoid_: live clipart reference, deactivated clipart, reusable library asset

**Order Font Reference**:
The saved font family ID and display name used by an Order Customization Snapshot. It references the shared Brand Font file rather than copying it into the order; a missing shared file is reported as an unavailable font.
_Avoid_: order font copy, embedded font binary, live font name lookup

**Order Media Transfer**:
The per-customized-order-item process that copies its required media into the order namespace. An order may be created with a failed transfer so an operator can repair and retry it; this failure does not invalidate the sale.
_Avoid_: failed checkout, incomplete order rejection, media copy as payment state

**Customization Publish Readiness**:
The product-level condition that a customizable product must satisfy before it can be published, including one Customization Background for every variant, matching background dimensions, and a valid customization editor model. Draft products may be incomplete but cannot open the customization editor until its required backgrounds are available.
_Avoid_: template publish validation, customization status

**Customization Setup Session**:
The unsaved admin FocusModal workflow for enabling customization on a published product. It stages each variant's Customization Background and the template, then submits one atomic multipart command that validates all state before creating an active customization record. Closing or failing validation leaves the product without customization enabled or newly created assets. It is distinct from a Shopper Customization Draft.
_Avoid_: persisted setup state, active customization, unpublished product, shopper draft

**Customization Activation**:
The explicit completion action in a Customization Setup Session that creates a valid customization record and makes it available in the shopper purchase flow. It performs final publish-readiness validation without changing the Product's published status; a failed activation does not persist customization.
_Avoid_: enable toggle, product republish, persisted invalid customization

**Customization Deactivation**:
The operator action that removes an active customization flow from storefront while retaining its saved template and every variant's Customization Background. While deactivated, Variant Media Management does not display or allow edits to those backgrounds. New variants may be created without a background, making later reactivation incomplete. It does not affect Product Thumbnail selection. Deactivation is required before permanent customization deletion.
_Avoid_: customization deletion, background cleanup, thumbnail reset, inactive background editing

**Permanent Customization Deletion**:
The explicit destructive action available only after Customization Deactivation. It removes the saved customization record, template layers and form fields, customization translations, every variant's Customization Background association and asset, and any Product Media reference to those assets. A Product Thumbnail referencing a deleted background is cleared. Enabling customization later starts a new Customization Setup Session without reusing prior backgrounds.
_Avoid_: deactivate, retained background, partial customization deletion

**Atomic Variant Creation**:
The admin flow that creates a Product Variant and its initially selected Gallery Media and Customization Background in one multipart command. Its modal has Information and Media tabs because a new variant has no persisted media owner yet. When the product has active customization, a valid same-sized Customization Background is required; successful creation preserves the active shopper flow. After creation, media changes use independent Variant Media Management.
_Avoid_: temporary uploaded asset, create-then-attach asset, media saved with variant edit

**Customization-Safe Variant Deletion**:
The deletion of one variant from an active customizable product without deactivating customization. The deleted variant's background leaves with it; the active Background Size Contract continues to apply only to remaining variants.
_Avoid_: automatic customization deactivation, orphaned active variant, deleted-background validation

**Customization Reactivation**:
The operator action that restores a deactivated saved customization. When every current variant already has a valid matching Customization Background, it activates immediately without opening setup. If any variant lacks a background, it opens a FocusModal to collect the missing backgrounds and activates only after all validation succeeds.
_Avoid_: always-open setup modal, activate incomplete customization, background editing from Manage Media while deactivated

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
_Avoid_: live product reference, product-media fallback, cart item reference, mutable order item

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

**MISA Checkout Customer**:
The purchasing party represented in MISA for a Trophy checkout order. Without a VAT invoice request, it is the person identified by the basic checkout information. With a VAT invoice request, it is the invoice entity identified by the VAT information. It is distinct from the individual Contact. Trophy derives it from the order snapshot rather than retaining a MISA Customer ID.
_Avoid_: always the delivery recipient, always the invoice company

**MISA Checkout Contact**:
The individual represented by the basic checkout information and linked to the MISA Checkout Customer. Trophy uses this Contact as the SaleOrder contact and derives it from the order snapshot rather than retaining a MISA Contact ID; it does not integrate tenant-only delivery-contact fields.
_Avoid_: VAT customer, shipping-contact field

**VAT Invoice Request**:
A shopper's explicit request for a VAT invoice. It requires an invoice entity name, tax ID, invoice email, and invoice address before checkout can proceed. Tax-ID validity is authoritative in MISA; Trophy does not apply an inferred browser checksum.
_Avoid_: issued invoice, optional VAT details
_Avoid_: incomplete cart item, draft order item, partially customized cart line

**Cart Line Merge**:
The storefront rule for combining shopper selections in the browser cart. Ordinary non-customized selections merge by product and variant, while ordinary customized selections merge only when product, variant, and customization values are identical; a Cart Line Revision always remains independent.
_Avoid_: always merge by SKU, never merge customized items, merge by product only

**Cart Line Revision**:
A shopper-initiated copy of any customized cart line, including one that is no longer checkout-ready, opened as a normal product-detail session with its selected variant and customization values restored. It starts at quantity one, and adding it always creates a distinct, independent cart line so the shopper can keep, compare, or remove either choice; if its source is no longer in the browser cart, the product detail session falls back to default product state.
_Avoid_: cart line edit, replace cart line, mutate cart line

**Cart Line Revision Revalidation**:
The recovery rule for a cart line revision when the current catalog or customization template no longer supports restored data. Compatible values are retained, invalid selections must be corrected before the revision can be added, and the source cart line remains unchanged.
_Avoid_: silently discard invalid value, rewrite original cart line, preserve obsolete selection

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
The production readiness state tracked per order item. Non-customized items are `not_required`; customized items start as `pending_review`; after an operator confirms the submitted customization snapshot is production-ready, the item becomes `ready`.
_Avoid_: order status, fulfillment status, customization status

**Admin Draft Discard Guard**:
A confirmation prompt shown when closing a create-product creation modal, preventing accidental data loss by requiring the operator to confirm discard before the modal closes. It covers the Escape key, backdrop click, Cancel button, and browser back. Does not appear after a successful submission.
_Avoid_: unsaved changes warning, dirty form guard, close protection
