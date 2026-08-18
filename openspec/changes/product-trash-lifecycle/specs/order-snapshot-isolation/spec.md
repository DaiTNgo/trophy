## ADDED Requirements

### Requirement: Admin Order reads use immutable snapshots only
The admin Order read model SHALL render Product, Variant, background, and customization information from the persisted Order Item Snapshot fields. It MUST NOT query current Product, Variant, or customization-media rows as a fallback for a historical Order Item.

#### Scenario: Admin reads an Order after its Product is permanently deleted
- **WHEN** an admin reads an Order whose original Product and Variant have been permanently deleted
- **THEN** the Order response SHALL render its item information from stored snapshots without a catalog lookup

#### Scenario: Historical snapshot data is malformed
- **WHEN** an admin reads an Order Item with malformed required snapshot data
- **THEN** the order read SHALL surface the snapshot-data failure and SHALL not substitute live Product or Variant data

### Requirement: Permanent Product deletion does not delete Order history
Permanent Product deletion SHALL leave all historical Order Items and their Product, Variant, price, background, and customization snapshot fields unchanged.

#### Scenario: Product cleanup follows an Order
- **WHEN** a Product with historical Orders is permanently deleted from Product Trash
- **THEN** subsequent admin Order reads SHALL return the same persisted order-item snapshot values
