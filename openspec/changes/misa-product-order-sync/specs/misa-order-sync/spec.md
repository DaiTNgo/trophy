## ADDED Requirements

### Requirement: Checkout synchronizes the local order to MISA
After a Trophy order is created successfully, the backend SHALL create or update the corresponding MISA contact and create a MISA sale order using the string form of each order item's Trophy variant ID as `product_code`.

#### Scenario: Successful order synchronization
- **WHEN** checkout creates an order whose items have valid Trophy variant IDs and MISA is configured
- **THEN** the backend sends the contact and sale order to MISA and records the MISA synchronization identifiers/status

#### Scenario: Local order survives MISA failure
- **WHEN** Trophy creates the local order but MISA returns an error
- **THEN** the local order remains created and the backend records the MISA error/status for later investigation

#### Scenario: Existing MISA contact is reused
- **WHEN** a MISA Contact already has the checkout customer's derived `contact_code`
- **THEN** the backend uses that Contact for the Sale Order and does not create a duplicate Contact

#### Scenario: Existing MISA contact is reused by email
- **WHEN** no Contact has the checkout customer's derived `contact_code`, but a MISA Contact has the same email address and phone number
- **THEN** the backend uses that Contact's code for the Sale Order and does not create a duplicate Contact

#### Scenario: Duplicate email with a different phone creates a phone fallback Contact
- **WHEN** a MISA Contact has the checkout email address but a different phone number
- **THEN** the backend creates a new Contact using the checkout phone-derived code without an email address, then uses it for the Sale Order

#### Scenario: Order item has no variant ID
- **WHEN** a created order item cannot provide a valid Trophy variant ID
- **THEN** MISA order synchronization fails with a clear validation error and does not send an invalid product mapping

### Requirement: MISA order payload preserves Trophy checkout data
The MISA sale order payload SHALL include the Trophy order number, customer/contact identity, phone, totals, shipping information, and line item quantities/prices using the documented MISA field types.

#### Scenario: Shipping and customer data are mapped
- **WHEN** checkout includes customer and shipping details
- **THEN** the MISA contact and sale order contain the corresponding normalized values

#### Scenario: Line totals match the order total
- **WHEN** Trophy sends an order item to MISA
- **THEN** its `to_currency` equals the persisted line subtotal, not a fixed value

#### Scenario: Payload omits unsupported metadata
- **WHEN** Trophy creates a MISA contact or sale order
- **THEN** the payload omits Trophy-only or undocumented MISA fields and uses the standard `Mẫu tiêu chuẩn` form layout

### Requirement: Admin Order Detail exposes MISA synchronization state
The authenticated Admin Order Detail response and screen SHALL show the order MISA synchronization status, MISA contact and sale-order identifiers, attempt count, latest successful synchronization time, and latest error when present.

#### Scenario: Admin reviews a synchronized order
- **WHEN** an order has been synchronized to MISA
- **THEN** Admin Order Detail displays `Synced` and the stored MISA identifiers and synchronization time

#### Scenario: Admin investigates a failed synchronization
- **WHEN** MISA synchronization for an order has failed
- **THEN** Admin Order Detail displays `Failed`, the attempt count, and the latest MISA error
