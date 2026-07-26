## ADDED Requirements

### Requirement: Temporary shopper-upload retention
The system SHALL create every new storefront shopper customization upload as a temporary asset with an expiry exactly 14 days after creation. This policy SHALL apply only to shopper-upload assets and SHALL NOT apply to catalog, clipart, font, admin-managed, or production-export assets.

#### Scenario: Shopper uploads an image
- **WHEN** a valid shopper image upload is accepted by the storefront customization-asset endpoint
- **THEN** the system stores the asset as temporary with an expiry 14 days after its creation time

#### Scenario: Shopper replaces an uploaded image
- **WHEN** a shopper uploads a replacement image for the same customization field
- **THEN** the replacement is a separate temporary asset with its own 14-day expiry and the earlier asset remains eligible for expiry cleanup

### Requirement: Checkout retains referenced shopper uploads
The system SHALL promote temporary shopper-upload assets referenced by a successfully created order's accepted customization snapshot to retained assets before they become eligible for cleanup.

#### Scenario: Checkout succeeds with an uploaded image
- **WHEN** order creation succeeds for an item whose accepted customization snapshot references a temporary shopper-upload asset
- **THEN** that asset is retained without a temporary expiry and remains available for the order artifact

#### Scenario: Checkout does not succeed
- **WHEN** order creation fails before an order is successfully created
- **THEN** referenced shopper-upload assets remain temporary and retain their existing expiry

### Requirement: Expired temporary uploads are unavailable
The system SHALL deny access to a temporary shopper-upload asset once its expiry has passed, even if scheduled cleanup has not yet removed its binary object or metadata.

#### Scenario: Browser cart references an expired upload
- **WHEN** a shopper returns to a persisted browser cart that references a temporary asset after its expiry
- **THEN** the storefront identifies the upload as unavailable, prompts the shopper to upload a replacement, and prevents checkout until customization is valid

#### Scenario: Retained order asset is requested after the temporary window
- **WHEN** an asset retained by a successful order is requested more than 14 days after its original upload
- **THEN** the system continues to serve the retained asset

### Requirement: Scheduled temporary-asset cleanup
The system SHALL run one scheduled cleanup process at least daily to reclaim expired temporary shopper-upload assets. The process SHALL delete the original object, any preview object, and the corresponding metadata record, while excluding retained and non-shopper assets.

#### Scenario: Scheduled cleanup finds an expired temporary asset
- **WHEN** the scheduled cleanup runs after a temporary shopper-upload asset has expired
- **THEN** it deletes the asset's R2 objects and D1 metadata record

#### Scenario: Scheduled cleanup retries after partial deletion
- **WHEN** a cleanup run previously deleted an asset object but did not remove its metadata record
- **THEN** a later cleanup run completes metadata removal without failing because the object is already absent

#### Scenario: Scheduled cleanup encounters an R2 deletion failure
- **WHEN** deletion of an expired temporary asset's R2 object fails
- **THEN** the system retains the metadata for a future retry and does not delete retained or non-shopper assets
