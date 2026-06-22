## ADDED Requirements

### Requirement: Authoritative Production Validation
The system SHALL repeat all production-sensitive customization validation on the backend before generating artwork.

#### Scenario: Browser validation is bypassed
- **WHEN** submitted design data contains text, DPI, asset, safe-area, or revision errors despite passing through the browser
- **THEN** the backend rejects production generation with stable error codes
- **AND** identifies the affected zones and layers

### Requirement: SVG Production Export
The system SHALL generate SVG artwork using the configured physical zone dimensions.

#### Scenario: Export a valid zone to SVG
- **WHEN** an operator exports a valid design zone
- **THEN** the SVG artboard has the configured physical dimensions
- **AND** text is represented as production-safe vector paths
- **AND** original image artwork is transformed and clipped to the zone

### Requirement: PDF Production Export
The system SHALL generate PDF artwork using the configured physical zone dimensions.

#### Scenario: Export a valid design to PDF
- **WHEN** an operator exports a valid design
- **THEN** every output page has dimensions derived from the applicable zone or export profile
- **AND** text remains embedded or outlined vector content
- **AND** original image artwork is transformed and clipped without flattening the whole page

### Requirement: Manufacturing Metadata
The system SHALL associate production output with the information required to identify and manufacture it.

#### Scenario: Inspect generated artwork
- **WHEN** an operator receives a generated file
- **THEN** the output or its manifest identifies the order, product, template revision, design revision, zone, production method, color expectation, and effective image DPI

### Requirement: Export Profiles
The system SHALL apply a versioned export profile independently from the shopper design document.

#### Scenario: Export zones separately
- **WHEN** the active profile specifies separate-zone output
- **THEN** the system produces independently identifiable zone artwork

#### Scenario: Export a combined workshop layout
- **WHEN** a later profile specifies a combined layout
- **THEN** the system arranges zone artwork according to that profile without modifying the purchased design

### Requirement: Deterministic Retryable Export
The system SHALL make production export deterministic and retryable for an immutable design revision and export profile revision.

#### Scenario: Retry a failed export
- **WHEN** generation fails after input validation
- **THEN** the system retains input and asset references plus the failure result
- **AND** an operator can retry without recreating the shopper design

#### Scenario: Request an already completed export
- **WHEN** the same immutable design and export profile are requested again
- **THEN** the system may return the existing valid artifact instead of producing a conflicting revision

### Requirement: Private Production Assets
The system SHALL keep original shopper uploads, approved fonts, and generated production files private by default.

#### Scenario: Upload an original image
- **WHEN** a shopper receives temporary upload authorization
- **THEN** the authorization is limited to the intended object operation and expiry
- **AND** storage credentials are not exposed to the browser
