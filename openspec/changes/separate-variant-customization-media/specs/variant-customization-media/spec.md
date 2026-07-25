## ADDED Requirements

### Requirement: Variant owns an independent customization media asset

The system SHALL represent a variant's Customization Media independently from its ordered Gallery Media, with at most one Customization Media asset owned by each variant. A Customization Media asset MUST NOT be shared by multiple variants.

#### Scenario: Create payload stores separate media roles
- **WHEN** an admin creates a product with Gallery Media and Customization Media for a variant
- **THEN** the product stores Gallery Media in the ordered variant gallery relationship
- **AND** the product stores the Customization Media in the variant customization relationship
- **AND** changing gallery order or gallery membership does not change the Customization Media

#### Scenario: Variant can have only a customization canvas
- **WHEN** a customizable variant has one Customization Media asset and no Gallery Media assets
- **THEN** the variant remains valid for customization readiness
- **AND** the read model reports an empty Gallery Media collection and the separate Customization Media asset

### Requirement: Admin exposes separate media actions

The admin Create Product and Product Detail variant interfaces SHALL expose Gallery media management separately from Customization Media management. Gallery management SHALL support the existing multi-media workflow; Customization Media management SHALL show `Upload customization media` when absent and `Replace customization media` when present. The Customization action SHALL be hidden when product customization is disabled.

#### Scenario: Create variant media controls are separate
- **WHEN** customization is enabled in Create Product
- **THEN** each variant row shows a Gallery media action and a separate Customization Media action
- **AND** uploading Gallery Media does not populate Customization Media
- **AND** uploading Customization Media does not populate Gallery Media

#### Scenario: Existing customization media uses replace action
- **WHEN** a variant already has Customization Media
- **THEN** the admin shows a thumbnail of that asset and a `Replace customization media` action
- **AND** the admin does not show a second upload/add action or a remove action for Customization Media

#### Scenario: Detail actions are available after creation
- **WHEN** an admin opens Product Detail for a customizable product
- **THEN** the variant editor provides the same separate Gallery and Customization Media actions
- **AND** replacing Customization Media is available without recreating the product

### Requirement: Customization uploads follow the product asset contract

Customization Media uploads SHALL accept PNG, JPEG, WebP, and PDF input using the product asset upload rules. PDF input MUST be converted to an image before it is used as a canvas. A replacement MUST be persisted only after the new asset passes validation.

#### Scenario: Replace rejects mismatched dimensions
- **WHEN** an admin uploads a replacement whose pixel dimensions differ from the dimensions required by the other variant Customization Media assets
- **THEN** the system rejects the replacement with an actionable dimension error
- **AND** the previously persisted Customization Media remains attached

#### Scenario: Replace failure preserves the old asset
- **WHEN** upload or persistence of a replacement fails
- **THEN** the existing Customization Media relationship remains unchanged
- **AND** the failed asset is not presented as the active canvas

#### Scenario: Superseded asset is deleted after successful replacement
- **WHEN** a replacement is saved successfully
- **THEN** the new asset becomes the variant's only Customization Media
- **AND** the superseded asset is deleted from product asset storage and metadata

#### Scenario: Variant deletion cleans up its canvas asset
- **WHEN** an admin deletes a variant that owns Customization Media
- **THEN** the variant relationship and its Customization Media asset are deleted
- **AND** Gallery Media for other variants remains unchanged

### Requirement: Customization readiness uses customization media

For an enabled customizable product, Customization Publish Readiness SHALL require exactly one Customization Media asset for every variant and identical positive pixel width and height across those assets. Gallery Media presence, count, order, and dimensions SHALL NOT satisfy or fail this requirement. Draft products MAY remain incomplete, but publish and editor entry SHALL enforce readiness.

#### Scenario: Draft can save missing customization media
- **WHEN** an admin saves a customizable product as a draft while one or more variants have no Customization Media
- **THEN** the draft save succeeds
- **AND** the product reports a readiness issue naming the missing variant canvas
- **AND** publish remains unavailable

#### Scenario: Editor is blocked while required media is missing
- **WHEN** an admin tries to open the customization editor for a customizable product with a missing variant Customization Media
- **THEN** the admin sees the readiness issue
- **AND** the editor does not open with a Gallery Media item substituted as a background

#### Scenario: Publish rejects missing or mismatched customization media
- **WHEN** an admin attempts to publish a customizable product with a missing canvas or a mismatched canvas dimension
- **THEN** the backend rejects the request with a typed readiness conflict
- **AND** the product remains unchanged

#### Scenario: Published variant creation cannot leave customization unready
- **WHEN** an admin adds a variant to a published customizable product without a valid same-sized Customization Media asset
- **THEN** the backend rejects the variant save
- **AND** no incomplete variant becomes available to shoppers

### Requirement: Editor uses variant customization media

The admin customization editor SHALL list only variant Customization Media assets as background choices, labeled with their variant identity. It SHALL not expose Gallery Media as canvas choices.

#### Scenario: Editor switches between variant canvases
- **WHEN** an admin selects a different variant background in the customization editor
- **THEN** the editor displays that variant's Customization Media
- **AND** the canvas dimensions remain within the shared Background Size Contract

### Requirement: Storefront follows selected variant customization media

The storefront SHALL render customization against the selected variant's Customization Media asset. Gallery Media SHALL remain the managed shopper reference gallery. If a variant has no Gallery Media, its Customization Media MAY be used only as a display fallback and SHALL NOT be added to the managed gallery collection.

#### Scenario: Selected variant changes customization canvas
- **WHEN** a shopper changes the selected variant on a customizable product
- **THEN** the customization preview uses the selected variant's Customization Media
- **AND** it does not use the first or currently viewed Gallery Media item as the canvas

#### Scenario: Gallery remains independent when present
- **WHEN** a variant has one Customization Media asset and one or more Gallery Media assets
- **THEN** the storefront gallery contains only the Gallery Media assets
- **AND** the customization preview uses only the Customization Media asset

#### Scenario: Customization media is fallback when gallery is empty
- **WHEN** a variant has Customization Media but no Gallery Media
- **THEN** storefront product imagery may use the Customization Media URL as the variant's display fallback
- **AND** gallery management still reports zero Gallery Media items
