## ADDED Requirements

### Requirement: Checkout synchronizes the local order to MISA

After a Trophy order is created successfully, the backend SHALL create or update the corresponding phone-keyed MISA Customer and Contact, then create a MISA sale order using the string form of each order item's Trophy variant ID as `product_code`.

#### Scenario: Customer and recipient are linked on the SaleOrder

- **WHEN** checkout creates an order with a customer name and phone number
- **THEN** the backend reuses or creates a MISA Customer whose `account_number` is `TROPHY-<normalized phone>`
- **AND THEN** it associates the MISA Contact and SaleOrder with that Customer using the documented Customer code fields

#### Scenario: Successful order synchronization

- **WHEN** checkout creates an order whose items have valid Trophy variant IDs and MISA is configured
- **THEN** the backend sends the contact and sale order to MISA and records the MISA synchronization identifiers/status

#### Scenario: Local order survives MISA failure

- **WHEN** Trophy creates the local order but MISA returns an error
- **THEN** the local order remains created and the backend records the MISA error/status for later investigation

#### Scenario: Existing MISA contact is reused

- **WHEN** a MISA Contact already has the checkout customer's derived `contact_code`
- **THEN** the backend uses that Contact for the Sale Order and does not create a duplicate Contact

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

#### Scenario: VAT request and addresses are preserved

- **WHEN** checkout includes billing details, a different shipping address, a VAT invoice request, or a shopper note
- **THEN** the MISA SaleOrder contains its documented billing/shipping address fields and a structured `description` containing the VAT request and shopper note
- **AND THEN** Trophy does not mark the order as invoiced before an invoice has actually been issued

#### Scenario: Duplicate VAT tax code creates an unlinked SaleOrder

- **WHEN** MISA rejects the pre-checkout VAT Customer create because its `tax_code` already exists
- **THEN** Trophy does not create a Customer or Contact
- **AND THEN** it creates the MISA SaleOrder without `account_name` or `contact_name`
- **AND THEN** the SaleOrder `description` identifies the duplicate tax code and tells an admin to link the correct Customer manually

#### Scenario: Duplicate Contact email creates a SaleOrder without Contact

- **WHEN** MISA rejects a new Contact because its email already exists
- **THEN** Trophy does not retry the Contact create without an email address
- **AND THEN** it creates the MISA SaleOrder with its Customer `account_name` but without `contact_name`
- **AND THEN** the SaleOrder `description` identifies the duplicate email and tells an admin to link the correct Contact manually

#### Scenario: Bank transfer uses the created order number as the payment reference

- **WHEN** checkout selects bank transfer and creates an order
- **THEN** Trophy stores `bank_transfer` as the payment method, returns a short-lived signed access token, and exposes a `PT-<order id>` payment reference while sending the full order number to MISA as `sale_order_no`
- **AND THEN** an invalid or expired token does not expose the order's payment instructions

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

### Requirement: Super-admin purges only abandoned checkout orders

Trophy SHALL provide a manual permanent order purge only to a super-admin and only while an order remains `pending`, with pending payment and unfulfilled fulfillment. Admin cancellation SHALL not be available.

#### Scenario: Purge removes an MISA SaleOrder before local data

- **WHEN** a super-admin purges an eligible order with a numeric MISA SaleOrder ID
- **THEN** Trophy deletes that SaleOrder in MISA before deleting local order rows
- **AND THEN** Trophy never deletes the MISA Contact

#### Scenario: MISA deletion cannot be completed

- **WHEN** MISA rejects or cannot process the SaleOrder deletion for an eligible order
- **THEN** Trophy preserves the local order

#### Scenario: MISA SaleOrder has already been removed

- **WHEN** MISA responds that the known SaleOrder is absent
- **THEN** Trophy treats the remote deletion as complete and purges the eligible local order

### Requirement: Super-admin manually reconciles an order MISA link

Trophy SHALL permit only a super-admin to manually disconnect, connect, or refresh a SaleOrder link. These operations SHALL not run automatically.

#### Scenario: Existing original SaleOrder is reused

- **WHEN** a super-admin connects or retries an order and MISA returns the original `sale_order_no` with a valid ID
- **THEN** Trophy stores that ID and MISA number as the current link without creating another SaleOrder

#### Scenario: Original number cannot be created or re-linked

- **WHEN** MISA reports the original SaleOrder number as duplicate but Trophy cannot retrieve a linkable original record
- **THEN** Trophy may create a revision number in the form `<orderNumber>-R<n>` and stores the actual created number

#### Scenario: Local disconnect retains MISA history

- **WHEN** a super-admin disconnects a MISA link
- **THEN** Trophy clears only its local SaleOrder link and marks the order `disconnected`
- **AND THEN** Trophy does not delete the MISA SaleOrder or Contact
