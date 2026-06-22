## ADDED Requirements

### Requirement: Product Customization Template
The system SHALL allow an administrator to attach a versioned customization template to a product.

#### Scenario: Publish a template revision
- **WHEN** an administrator publishes a valid customization template
- **THEN** the system creates an immutable template revision
- **AND** the product exposes that revision to new shopper designs

#### Scenario: Edit a published template
- **WHEN** an administrator edits a published template
- **THEN** the system creates a new draft revision
- **AND** existing designs continue to reference their original revision

### Requirement: Cup Preview
The system SHALL associate each customization template with a cup preview asset used for zone placement and shopper visualization.

#### Scenario: Upload a cup preview
- **WHEN** an administrator uploads a valid cup preview image
- **THEN** the system stores the asset and its intrinsic dimensions
- **AND** the template editor displays it without treating it as production artwork

### Requirement: Multiple Customization Zones
The system SHALL support multiple independent rectangular customization zones on one template.

#### Scenario: Define several cup surfaces
- **WHEN** an administrator defines front, back, and base zones
- **THEN** the system stores each zone with a stable identifier and display name
- **AND** each zone maintains an isolated set of rules and shopper layers

### Requirement: Zone Preview Placement
The system SHALL store zone placement as normalized bounds relative to the cup preview and SHALL support zone rotation.

#### Scenario: Display a zone responsively
- **WHEN** the same template is displayed at different browser sizes
- **THEN** the zone retains the same relative position, size, and rotation over the cup preview

### Requirement: Physical Zone Configuration
The system SHALL require production dimensions and boundaries for each published zone.

#### Scenario: Configure a production zone
- **WHEN** an administrator supplies width, height, safe margin, and bleed in millimetres
- **THEN** the system stores those values independently from preview pixels
- **AND** production validation uses the physical values

#### Scenario: Reject invalid physical dimensions
- **WHEN** a zone has non-positive dimensions or safe and bleed values that make its usable area invalid
- **THEN** the system rejects template publication

### Requirement: Zone Content Policy
The system SHALL allow each zone to enable text, images, or both and to define production rules for enabled content.

#### Scenario: Configure single-line text rules
- **WHEN** text is enabled for a zone
- **THEN** the administrator can select approved fonts and minimum and maximum font sizes
- **AND** the zone remains restricted to a single line

#### Scenario: Configure image rules
- **WHEN** images are enabled for a zone
- **THEN** the administrator can define a minimum effective DPI

### Requirement: Zone Production Policy
The system SHALL store a production method and color expectation for each zone.

#### Scenario: Configure an engraving zone
- **WHEN** an administrator marks a zone for engraving
- **THEN** the system records the engraving method and its configured monochrome or grayscale expectation
