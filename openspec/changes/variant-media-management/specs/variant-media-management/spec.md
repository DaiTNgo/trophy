## ADDED Requirements

### Requirement: Persisted variants expose independent media management
The admin SHALL expose `Manage media` from a persisted Product Variant's row actions and SHALL open a dedicated media management FocusModal. Variant Details SHALL NOT contain Gallery Media or Customization Background controls.

#### Scenario: Operator opens media management
- **WHEN** an operator selects `Manage media` for a persisted variant
- **THEN** the admin opens the variant's dedicated media FocusModal without opening Variant Details

### Requirement: Gallery Media commands take effect immediately
The system SHALL accept Gallery Media multipart uploads for a persisted variant, append accepted assets in selected-file order, and return server-confirmed variant state.

#### Scenario: Operator uploads multiple gallery files
- **WHEN** an operator uploads valid files in the media manager
- **THEN** the backend writes each object to the final variant namespace, attaches each asset to that variant, and appends them in selected-file order

### Requirement: Product Thumbnail selects one eligible asset
The system SHALL store one nullable Product Thumbnail asset reference. Operators SHALL select a Variant Gallery Media or Customization Background asset directly, or upload one product-owned thumbnail asset. The storefront SHALL return `null` when it is unset rather than selecting a fallback asset.

#### Scenario: Operator selects a Customization Background as thumbnail
- **WHEN** an operator selects a referenced variant Customization Background as Product Thumbnail
- **THEN** the product stores that asset reference without creating another R2 object

### Requirement: Gallery Media removal permanently removes its owned asset
The system SHALL allow a Gallery Media asset to belong to exactly one variant. Removing it from that variant SHALL remove its variant association, clear a matching Product Thumbnail, its R2 object, and its D1 asset record.

#### Scenario: Operator removes the selected thumbnail asset
- **WHEN** an operator deletes Gallery Media used by Product Thumbnail
- **THEN** the system clears the thumbnail and does not choose a fallback thumbnail

### Requirement: Customization Background is replaced atomically
The system SHALL provide only a replacement action for a persisted variant's Customization Background. The admin SHALL validate candidate dimensions before requesting replacement, and the backend SHALL inspect the file and validate the Background Size Contract before making any persistent change.

#### Scenario: Replacement dimensions match the other variant backgrounds
- **WHEN** an operator replaces a Customization Background with valid matching dimensions
- **THEN** the backend writes the new final-key object, updates the association, removes the previous object and asset, and clears a matching Product Thumbnail

#### Scenario: Replacement dimensions do not match
- **WHEN** an operator selects a Customization Background whose dimensions differ from another variant background
- **THEN** the admin rejects it before the request and the backend also rejects any direct request without changing the current background

### Requirement: Media failures preserve confirmed state and allow retry
The admin SHALL retain server-confirmed media state after a failed upload, replacement, or removal and SHALL present a contextual retry action.

#### Scenario: A media command fails
- **WHEN** a media management command returns an error
- **THEN** the modal retains its previously confirmed media state and allows the operator to retry the failed command
