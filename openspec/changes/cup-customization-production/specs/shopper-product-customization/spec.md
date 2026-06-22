## ADDED Requirements

### Requirement: Multi-Zone Customization Editor
The system SHALL provide a shopper editor for every enabled zone in the product's published customization template.

#### Scenario: Switch between zones
- **WHEN** a shopper selects another customization zone
- **THEN** the editor displays that zone's independent layers and rules
- **AND** layers in other zones remain unchanged

### Requirement: Renderer-Independent Design State
The system SHALL persist shopper customization as renderer-independent design data tied to an exact template revision.

#### Scenario: Save a draft design
- **WHEN** a shopper saves a customization draft
- **THEN** the system stores zone-local layer properties, transforms, and immutable asset references
- **AND** the stored design does not depend on browser pixels, HTML, or a flattened canvas bitmap

### Requirement: Single-Line Text Fitting
The system SHALL keep shopper text on one line and automatically select the largest allowed font size that fits the zone safe width.

#### Scenario: Shrink text to fit
- **WHEN** entered text exceeds the safe width at the maximum font size
- **THEN** the system reduces the font size without horizontal distortion
- **AND** selects the largest permitted size that fits

#### Scenario: Reject text below the minimum size
- **WHEN** entered text cannot fit at the configured minimum font size
- **THEN** the system marks the layer invalid
- **AND** prevents checkout until the text is corrected

#### Scenario: Remove line breaks
- **WHEN** a shopper enters or pastes text containing line breaks
- **THEN** the editor normalizes the value to a single line before fitting it

### Requirement: Approved Production Fonts
The system SHALL restrict customization text to approved, revisioned production fonts.

#### Scenario: Use the same font metrics in preview and production
- **WHEN** the editor fits a text layer
- **THEN** it measures the exact approved font revision used by backend validation and export

### Requirement: Image Upload and Manipulation
The system SHALL allow a shopper to upload an image and move, scale, rotate, and crop it within an enabled zone.

#### Scenario: Crop an image to a zone
- **WHEN** a shopper moves or scales an image beyond the zone boundary
- **THEN** the editor clips the preview to the zone
- **AND** stores the transform needed to reproduce the crop from the original image

#### Scenario: Preserve the original upload
- **WHEN** the system creates a smaller editor preview
- **THEN** it retains the original image as the production source
- **AND** never substitutes the preview derivative during production export

### Requirement: Effective Image DPI
The system SHALL calculate image quality from the source pixels used after crop and the physical output size.

#### Scenario: Report acceptable image quality
- **WHEN** an image's effective DPI meets the zone threshold
- **THEN** the editor reports that the image is production-ready

#### Scenario: Block low-resolution artwork
- **WHEN** an image's effective DPI is below the zone's blocking threshold
- **THEN** the system identifies the affected zone and layer
- **AND** prevents checkout

### Requirement: Immutable Purchased Design
The system SHALL freeze a validated design revision before it is used for an order or production export.

#### Scenario: Template changes after checkout
- **WHEN** an administrator publishes a new template revision after a shopper has checked out
- **THEN** the purchased design continues to use its original template and design revisions
