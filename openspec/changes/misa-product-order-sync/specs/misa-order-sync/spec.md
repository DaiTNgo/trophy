## ADDED Requirements

### Requirement: Checkout synchronizes the local order to MISA
After a Trophy order is created successfully, the backend SHALL create or update the corresponding MISA contact and create a MISA sale order using each order item's SKU as `product_code`.

#### Scenario: Successful order synchronization
- **WHEN** checkout creates an order whose items have valid SKUs and MISA is configured
- **THEN** the backend sends the contact and sale order to MISA and records the MISA synchronization identifiers/status

#### Scenario: Local order survives MISA failure
- **WHEN** Trophy creates the local order but MISA returns an error
- **THEN** the local order remains created and the backend records the MISA error/status for later investigation

#### Scenario: Order item has no SKU
- **WHEN** a created order item cannot provide an SKU
- **THEN** MISA order synchronization fails with a clear validation error and does not send an invalid product mapping

### Requirement: MISA order payload preserves Trophy checkout data
The MISA sale order payload SHALL include the Trophy order number, customer/contact identity, phone, totals, shipping information, and line item quantities/prices using the documented MISA field types.

#### Scenario: Shipping and customer data are mapped
- **WHEN** checkout includes customer and shipping details
- **THEN** the MISA contact and sale order contain the corresponding normalized values
