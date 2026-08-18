## ADDED Requirements

### Requirement: Customized order items own immutable required media
The system SHALL copy only the selected customization background, shopper-uploaded assets, and selected clipart for a customized order item into that item's order namespace. A non-customized order item SHALL not copy catalog or variant media.

#### Scenario: A customized item is checked out
- **WHEN** checkout accepts an item with a customization snapshot
- **THEN** the system creates order-owned copies of its required background, uploads, and selected clipart and snapshots order-owned asset URLs

#### Scenario: A plain item is checked out
- **WHEN** checkout accepts an item without a customization snapshot
- **THEN** the system creates no order-owned catalog or variant media copies

### Requirement: Historic custom media survives catalog and library cleanup
The system SHALL render an Order Customization Snapshot from its order-owned background, upload, and clipart copies after the source catalog product or clipart asset is replaced or permanently deleted.

#### Scenario: A product is permanently deleted after checkout
- **WHEN** an order contains a customized item from that product
- **THEN** its customization preview and production inputs remain available from the order prefix

#### Scenario: A selected clipart library asset is permanently deleted
- **WHEN** a past customized order selected that clipart
- **THEN** the order continues to use its order-owned clipart copy

### Requirement: Brand fonts remain shared references
The system SHALL snapshot a selected dynamic font's family ID and display name without copying its TTF binary into an order.

#### Scenario: A shared font is unavailable for a historic order
- **WHEN** an operator opens a customization preview whose referenced font file is missing
- **THEN** the system identifies the saved font name and reports that the font cannot be loaded without invalidating the order record

### Requirement: Transfer failures are retryable and do not reject checkout
The system SHALL create an order when a required custom-media transfer fails, record a retryable per-item transfer error, and expose the failure to an authorized admin operator.

#### Scenario: A required copy fails during checkout
- **WHEN** the system cannot copy one required media object into the order prefix
- **THEN** checkout returns the created order with a media-transfer warning and the affected item is marked failed for retry

#### Scenario: An admin retries a failed transfer
- **WHEN** an authorized admin retries a failed item transfer after its source becomes available
- **THEN** the system completes any missing copies idempotently and marks the item transfer complete

### Requirement: Order media lasts until permanent order deletion
The system SHALL retain order-owned media until the associated order is permanently deleted and SHALL remove the complete order R2 prefix and associated transfer records during that deletion.

#### Scenario: An order is permanently deleted
- **WHEN** an operator permanently deletes an order
- **THEN** the system deletes the order-owned R2 media and records while leaving shared catalog, clipart, and font media unaffected
