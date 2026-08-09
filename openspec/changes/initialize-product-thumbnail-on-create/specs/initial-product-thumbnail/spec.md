## ADDED Requirements

### Requirement: Initialize a thumbnail from created variant media
The system SHALL initialize the Product Thumbnail during Admin full-create for both draft and published Products by referencing the first eligible media asset across created variants in creation order. For each variant, the system MUST prefer its Customization Background and MUST otherwise use its first Variant Media in gallery order. The system MUST not create, upload, or copy an additional media object for this reference.

#### Scenario: Customization Background takes precedence for the first eligible variant
- **WHEN** the first created variant has both a Customization Background and Variant Media
- **THEN** the created Product's `thumbnailAssetId` references that variant's Customization Background asset

#### Scenario: Variant Media is used when no Customization Background exists
- **WHEN** an eligible created variant has no Customization Background and has multiple Variant Media assets
- **THEN** the created Product's `thumbnailAssetId` references that variant's first gallery-position asset

#### Scenario: A later variant supplies the first eligible media
- **WHEN** one or more earlier created variants have no eligible media and a later created variant has eligible media
- **THEN** the created Product's `thumbnailAssetId` references the first eligible asset from that later variant

#### Scenario: No eligible variant media exists
- **WHEN** no created variant has a Customization Background or Variant Media
- **THEN** the created Product is returned successfully with an empty `thumbnailAssetId`

### Requirement: Thumbnail initialization does not block product creation
The system SHALL treat only the Product Thumbnail reference assignment as best effort after all required full-create persistence has succeeded. A failure in that assignment MUST be logged with the Product and selected asset context, and MUST NOT fail the full-create response or roll back the created Product, variants, or media.

#### Scenario: Thumbnail reference assignment fails
- **WHEN** the system cannot persist the selected `thumbnailAssetId` after Product, variant, and media creation succeeds
- **THEN** the full-create request returns success for the created Product and the Product remains available without a thumbnail

#### Scenario: Required media persistence fails
- **WHEN** uploading or persisting required variant media fails before thumbnail initialization
- **THEN** the full-create request retains its existing failure and cleanup behavior

### Requirement: Initial selection is one-time
The system SHALL select the Initial Product Thumbnail only during Admin full-create and MUST NOT automatically recalculate it after Product creation.

#### Scenario: Variant media changes after creation
- **WHEN** an operator later adds, replaces, or deletes variant media after the Product was created
- **THEN** the system does not select a new thumbnail automatically
