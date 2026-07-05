## ADDED Requirements

### Requirement: Storefront cart stores checkout-ready shopper selections
The system SHALL maintain a browser-owned storefront cart containing cart lines with product ID, variant ID, quantity, and any required customization values.

#### Scenario: Adds selected priced variant to cart
- **WHEN** a shopper selects a priced variant and adds a positive quantity from product detail
- **THEN** the storefront stores a cart line for that product, variant, and quantity

#### Scenario: Requires variant selection before add-to-cart
- **WHEN** a product has multiple variants and the shopper has not selected one
- **THEN** the storefront prevents add-to-cart and asks the shopper to select a variant

#### Scenario: Auto-selects only purchasable variant
- **WHEN** a product has exactly one priced variant
- **THEN** the storefront may select it by default for add-to-cart

#### Scenario: Rejects Contact Price variant in cart
- **WHEN** the selected variant has no numeric price
- **THEN** the storefront does not create a cart line and shows a contact action instead

#### Scenario: Requires customization before cart
- **WHEN** a customizable product is missing required shopper customization values
- **THEN** the storefront prevents add-to-cart until the required values are supplied

#### Scenario: Merges non-customized cart lines
- **WHEN** a shopper adds the same non-customized product and variant more than once
- **THEN** the storefront merges the selections by increasing quantity

#### Scenario: Keeps distinct customized cart lines
- **WHEN** a shopper adds the same customizable product and variant with different customization values
- **THEN** the storefront stores separate cart lines

#### Scenario: Merges identical customized cart lines
- **WHEN** a shopper adds the same customizable product and variant with identical customization values
- **THEN** the storefront merges the selections by increasing quantity

### Requirement: Storefront cart lines are hydrated from backend product data
The system SHALL expose a public Storefront Route Surface endpoint that resolves browser cart lines into current shopper-safe display and availability data.

#### Scenario: Resolves multiple cart lines
- **WHEN** the storefront submits multiple product and variant selections for cart hydration
- **THEN** the system returns one result per requested selection

#### Scenario: Returns shopper-safe cart display data
- **WHEN** a requested product and variant are valid and published
- **THEN** the response includes product title, product handle, variant title, SKU when available, thumbnail, price amount, customizable flag, and whether customization is required

#### Scenario: Reports stale cart line
- **WHEN** a requested product is missing, unpublished, archived, or the variant no longer belongs to that product
- **THEN** the response marks that line invalid with a shopper-safe reason

#### Scenario: Reports Contact Price line
- **WHEN** a requested variant has no numeric price
- **THEN** the response marks that line unavailable for checkout because Contact Price items cannot be ordered

#### Scenario: Leaves deep customization validation to order creation
- **WHEN** a cart line includes customization values
- **THEN** cart hydration does not perform full production customization validation

### Requirement: Storefront order creation accepts multi-item checkout submissions
The system SHALL expose a public `POST /api/storefront/orders` endpoint that accepts customer details, shipping details, and one or more checkout-ready cart lines without requiring a shopper payment method.

#### Scenario: Creates order for multiple priced items
- **WHEN** a shopper submits valid customer details, shipping details, and two or more valid priced order items
- **THEN** the system creates one order containing all submitted items and returns a confirmation summary with an order number

#### Scenario: Creates manual order without payment selection
- **WHEN** a shopper submits a valid order without `payment.method`
- **THEN** the system creates the order with `status` pending, `paymentStatus` pending, and `fulfillmentStatus` unfulfilled

#### Scenario: Rejects empty item list
- **WHEN** a shopper submits an order request with no items
- **THEN** the system rejects the request with a validation error and creates no order

#### Scenario: Rejects invalid quantity
- **WHEN** a shopper submits an order item with quantity less than one
- **THEN** the system rejects the request with a validation error and creates no order

### Requirement: Storefront order creation validates customer and address data
The system SHALL require customer name and phone, a primary shipping address, and a different shipping address when the shopper selects ship-to-different-address.

#### Scenario: Accepts primary shipping address
- **WHEN** a shopper submits `shipToDifferentAddress` as false with valid customer name, customer phone, and primary address line
- **THEN** the system accepts the address data for order creation

#### Scenario: Accepts different shipping address
- **WHEN** a shopper submits `shipToDifferentAddress` as true with valid primary address and valid different recipient name, recipient phone, and different address line
- **THEN** the system stores both the primary address snapshot and the different shipping address snapshot

#### Scenario: Rejects missing different shipping recipient
- **WHEN** a shopper submits `shipToDifferentAddress` as true without different recipient name, recipient phone, or different address line
- **THEN** the system rejects the request with a validation error and creates no order

#### Scenario: Treats email as optional
- **WHEN** a shopper submits valid required customer and shipping details without an email address
- **THEN** the system accepts the order request

### Requirement: Storefront order items use server-authoritative product and price data
The system SHALL treat `productId`, `variantId`, and `quantity` as the shopper's item selection and SHALL derive product, variant, and price snapshot data from the backend database at order creation time.

#### Scenario: Captures current variant price
- **WHEN** a shopper submits a valid item for a published product variant with a numeric price
- **THEN** the system stores the current variant price as the order item unit price and uses it to calculate order totals

#### Scenario: Ignores client-submitted price fields
- **WHEN** a shopper submits extra price, product title, variant title, SKU, or background fields in an order item
- **THEN** the system does not trust those fields for order pricing or item snapshots

#### Scenario: Rejects unpublished product
- **WHEN** a shopper submits an item for a missing, draft, or archived product
- **THEN** the system rejects the request and creates no order

#### Scenario: Rejects variant from another product
- **WHEN** a shopper submits a `variantId` that does not belong to the submitted `productId`
- **THEN** the system rejects the request and creates no order

#### Scenario: Rejects contact price item
- **WHEN** a shopper submits an item whose selected variant has no numeric price
- **THEN** the system rejects the request and creates no order

### Requirement: Storefront order creation enforces customization requirements per item
The system SHALL require customization values for customizable products and SHALL reject customization data for non-customizable products.

#### Scenario: Requires customization values for customizable product
- **WHEN** a shopper submits an item for a product with enabled product customization without `customization.values`
- **THEN** the system rejects the request and creates no order

#### Scenario: Rejects customization for non-customizable product
- **WHEN** a shopper submits `customization.values` for a product without enabled product customization
- **THEN** the system rejects the request and creates no order

#### Scenario: Validates customization values
- **WHEN** a shopper submits customization values that are missing required fields, reference unavailable text style options, or contain invalid image upload values
- **THEN** the system rejects the request and creates no order

#### Scenario: Accepts valid customization values
- **WHEN** a shopper submits valid customization values for a customizable product and selected variant
- **THEN** the system accepts the item for order creation

### Requirement: Storefront order creation captures immutable item snapshots
The system SHALL persist an immutable order item snapshot for each order item containing product, variant, price, selected background, and customization context needed to reproduce what the shopper purchased.

#### Scenario: Stores non-customized item snapshot
- **WHEN** a shopper submits a valid item for a non-customizable product
- **THEN** the system stores a product snapshot, variant snapshot, unit price snapshot, line subtotal, and `productionStatus` set to `not_required`

#### Scenario: Stores customized item snapshot
- **WHEN** a shopper submits a valid item for a customizable product
- **THEN** the system stores raw customization values, a backend-built rendered design snapshot, the product customization template snapshot, the selected variant background snapshot, and `productionStatus` set to `pending_review`

#### Scenario: Preserves submitted address snapshots
- **WHEN** the system creates an order
- **THEN** the system stores the primary address snapshot and any different shipping address snapshot supplied in the request

### Requirement: Storefront order creation returns confirmation summary
The system SHALL return a shopper-facing order confirmation summary after successful order creation.

#### Scenario: Returns order summary
- **WHEN** the system creates an order successfully
- **THEN** the response includes order number, status, total amount, currency code, item count, and creation timestamp

#### Scenario: Uses order number for shopper confirmation
- **WHEN** the system creates an order successfully
- **THEN** the response includes an order number distinct from the internal database id

### Requirement: Storefront order lookup requires order number and phone
The system SHALL expose a shopper-facing order lookup flow that requires both order number and customer phone.

#### Scenario: Looks up order with matching phone
- **WHEN** a shopper provides an existing order number and the matching customer phone
- **THEN** the system returns a shopper-safe order summary

#### Scenario: Rejects lookup with wrong phone
- **WHEN** a shopper provides an existing order number with a non-matching phone
- **THEN** the system does not return that order's details

#### Scenario: Rejects lookup by order number alone
- **WHEN** a shopper provides only an order number
- **THEN** the system rejects the lookup request

#### Scenario: Hides internal order data from shopper lookup
- **WHEN** a shopper lookup succeeds
- **THEN** the response excludes raw rendered design JSON, template snapshots, production internals, admin notes, and other admin-only fields

### Requirement: Storefront checkout clears cart only after successful order creation
The storefront SHALL preserve cart contents until the backend confirms order creation.

#### Scenario: Clears cart after successful order creation
- **WHEN** checkout submission succeeds
- **THEN** the storefront clears the browser cart and navigates to order confirmation

#### Scenario: Preserves cart after failed order creation
- **WHEN** checkout submission fails due to validation or network error
- **THEN** the storefront keeps the cart contents and shows an actionable error

### Requirement: Admin order list and detail read backend orders
The admin app SHALL read storefront-created orders from authenticated backend admin order endpoints instead of mock order data.

#### Scenario: Lists backend orders for admin
- **WHEN** an authenticated admin opens the orders list
- **THEN** the admin app displays orders returned by the backend admin order list endpoint

#### Scenario: Shows backend order detail by order number
- **WHEN** an authenticated admin opens `/orders/:orderNumber`
- **THEN** the admin app displays the order detail returned by the backend admin order detail endpoint

#### Scenario: Requires admin session for admin order reads
- **WHEN** a request without a valid admin session calls an admin order endpoint
- **THEN** the system rejects the request

#### Scenario: Shows customization values read-only
- **WHEN** an admin views a customized order item
- **THEN** the admin detail shows shopper-entered customization values in a readable form without exposing raw database dumps

#### Scenario: Does not provide status transition workflow in this slice
- **WHEN** an admin views a backend-backed order
- **THEN** capture, fulfill, cancel, production approval, and export workflows are absent or disabled until a later change
