## ADDED Requirements

### Requirement: Storefront order creation accepts multi-item checkout submissions
The system SHALL expose a public `POST /api/storefront/orders` endpoint that accepts customer details, shipping details, manual payment method, and one or more order items.

#### Scenario: Creates order for multiple priced items
- **WHEN** a shopper submits valid customer details, shipping details, `payment.method`, and two or more valid priced order items
- **THEN** the system creates one order containing all submitted items and returns a confirmation summary with an order number

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

### Requirement: Storefront order creation supports manual payment methods
The system SHALL accept only manual payment methods `bank_transfer` and `cash_on_delivery` for storefront order creation.

#### Scenario: Creates bank transfer order
- **WHEN** a shopper submits a valid order with `payment.method` set to `bank_transfer`
- **THEN** the system creates the order with `status` pending, `paymentStatus` pending, and `fulfillmentStatus` unfulfilled

#### Scenario: Creates cash on delivery order
- **WHEN** a shopper submits a valid order with `payment.method` set to `cash_on_delivery`
- **THEN** the system creates the order with `status` pending, `paymentStatus` pending, and `fulfillmentStatus` unfulfilled

#### Scenario: Rejects unsupported payment method
- **WHEN** a shopper submits an order with a payment method other than `bank_transfer` or `cash_on_delivery`
- **THEN** the system rejects the request with a validation error and creates no order

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
- **THEN** the response includes order id, order number, status, payment status, fulfillment status, total amount, currency code, item count, and creation timestamp

#### Scenario: Uses order number for shopper confirmation
- **WHEN** the system creates an order successfully
- **THEN** the response includes an order number distinct from the internal database id
