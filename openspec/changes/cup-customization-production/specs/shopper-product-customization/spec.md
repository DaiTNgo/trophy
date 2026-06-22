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
- **THEN** the system stores typed values keyed by stable block identifiers and immutable asset references
- **AND** the stored design does not depend on browser pixels, HTML, or a flattened canvas bitmap

### Requirement: Form-Driven Customization

The system SHALL render shopper controls from the published template's ordered block definitions.

#### Scenario: Edit a customization value

- **WHEN** a shopper enters text or selects a configured option
- **THEN** the preview updates the corresponding fixed block
- **AND** the preview does not expose drag, resize, rotate, or crop controls

#### Scenario: Apply default values

- **WHEN** a shopper opens a customizable product
- **THEN** configured default text, logo, background, color, and style values are selected
- **AND** those defaults are included in validation and the review summary

#### Scenario: Show a conditional upload

- **WHEN** a shopper selects an “upload your own” design style
- **THEN** the configured upload and artwork-rights blocks become visible
- **AND** values from hidden alternatives are excluded from checkout

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

### Requirement: Bounded Multi-Line Text

The system SHALL support textarea blocks with administrator-defined character and line limits.

#### Scenario: Enforce textarea limits

- **WHEN** a shopper enters or pastes textarea content
- **THEN** the editor preserves no more than the configured `maxLines`
- **AND** prevents checkout when the configured `maxChars` or `maxLines` limit is exceeded

### Requirement: Approved Production Fonts

The system SHALL restrict customization text to approved, revisioned production fonts.

#### Scenario: Use the same font metrics in preview and production

- **WHEN** the editor fits a text layer
- **THEN** it measures the exact approved font revision used by backend validation and export

### Requirement: Fixed Image Placement

The system SHALL allow configured preset selection or shopper upload only in administrator-defined media blocks.

#### Scenario: Render selected media

- **WHEN** a shopper selects a preset logo/background or uploads allowed artwork
- **THEN** the editor renders it using the block's fixed placement and fit policy
- **AND** the shopper cannot change its geometry

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

### Requirement: Final Design Confirmation

The system SHALL require final review when the published template defines a confirmation block.

#### Scenario: Confirm before checkout

- **WHEN** all visible required blocks are valid
- **THEN** the shopper can review the composed preview and confirm it
- **AND** checkout remains blocked until confirmation is recorded
