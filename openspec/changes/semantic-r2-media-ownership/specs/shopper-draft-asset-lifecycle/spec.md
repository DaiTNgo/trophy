## ADDED Requirements

### Requirement: Shopper draft uploads expire after seven days
The system SHALL mark each new shopper customization upload as a Shopper Customization Draft asset with an expiry exactly seven days after creation.

#### Scenario: A shopper uploads an image
- **WHEN** the storefront accepts a valid customization upload
- **THEN** the asset is eligible for cleanup seven days after creation unless it is protected by an incomplete order-media transfer

### Requirement: Incomplete order transfer protects shopper source media
The system SHALL exempt shopper-draft media referenced by a pending or failed Order Media Transfer from expiry cleanup until transfer completion or permanent order deletion.

#### Scenario: Checkout creates an order with failed media transfer
- **WHEN** an order item transfer fails after checkout creates the order
- **THEN** its shopper-draft source remains available for admin retry beyond the normal seven-day expiry

#### Scenario: A protected transfer completes
- **WHEN** all required target copies for an order item are complete
- **THEN** the system removes expiry protection from its shopper-draft sources and may delete them after a successful order copy according to the transfer cleanup policy

### Requirement: Scheduled cleanup reconciles eligible shopper drafts
The system SHALL run a scheduled cleanup at least daily that selects bounded batches of expired, unprotected shopper-draft records and deletes their R2 source/preview objects and D1 metadata idempotently.

#### Scenario: Scheduled cleanup deletes an abandoned shopper upload
- **WHEN** the cleanup runs for an expired unprotected shopper-draft asset
- **THEN** it removes its objects and metadata record

#### Scenario: Cleanup resumes after partial deletion
- **WHEN** a previous cleanup removed an object but failed before deleting its metadata
- **THEN** a later cleanup treats the missing object as already deleted and completes metadata removal

#### Scenario: Cleanup cannot remove an R2 object
- **WHEN** deletion of an eligible object fails
- **THEN** the system retains its metadata for a later retry and records the cleanup failure
