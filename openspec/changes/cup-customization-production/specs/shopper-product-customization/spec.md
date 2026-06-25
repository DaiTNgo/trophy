## ADDED Requirements

### Requirement: Block-Driven Customization Editor

The system SHALL provide a shopper editor for every enabled block in the product's published customization template.

#### Scenario: Re-render the same preview on different screen sizes

- **WHEN** the same shopper design is opened on desktop and mobile layouts
- **THEN** the preview image may change displayed pixel size while preserving its aspect ratio
- **AND** every renderable block is recalculated from normalized template geometry so the composed preview remains aligned to the product image

#### Scenario: Exclude hidden blocks from the shopper experience

- **WHEN** an administrator has hidden a block in the published template
- **THEN** the shopper does not see that block in the form
- **AND** the shopper preview does not render output for that block

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
- **AND** the preview does not allow the shopper to move, resize, rotate, or reorder administrator-defined block bounds

#### Scenario: Reuse shopper rendering rules in admin preview mode

- **WHEN** an administrator enters preview mode for a draft template
- **THEN** the system renders the same form-control and preview behavior used by the shopper experience
- **AND** the draft preview does not require the administrator to open the storefront route to test those behaviors

#### Scenario: Render v1 block controls

- **WHEN** a product template contains v1 personalization blocks
- **THEN** the shopper form renders `text_single` as a one-line input, `text_multi` as a bounded textarea, `image_upload` as an upload control, and `icon_picker` as an option grid
- **AND** the form does not render `perpetual_list` in v1

#### Scenario: Apply default values

- **WHEN** a shopper opens a customizable product
- **THEN** configured default text and icon values are selected
- **AND** those defaults are included in validation and the review summary

#### Scenario: Show shopper-selectable text styles only when enabled

- **WHEN** an administrator publishes a text block with shopper-selectable color or font-family options
- **THEN** the shopper form renders only those configured style selectors for that block
- **AND** fixed styles are applied automatically without extra shopper controls

#### Scenario: Show a conditional upload

- **WHEN** a shopper selects an “upload your own” design style
- **THEN** the configured upload and artwork-rights blocks become visible
- **AND** values from hidden alternatives are excluded from checkout

### Requirement: Single-Line Text Fitting

The system SHALL keep shopper text on one line and automatically select the largest allowed font size that fits the block safe width.

#### Scenario: Normalize a text_single value

- **WHEN** a shopper edits a `text_single` block
- **THEN** the editor enforces the configured character limit and optional uppercase treatment
- **AND** the stored value contains no line breaks

#### Scenario: Apply selected text style

- **WHEN** a shopper selects an allowed color or font family for a text block
- **THEN** the preview updates using that selected style
- **AND** the saved design stores only allowed style values for that block

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

The system SHALL support `text_multi` blocks with administrator-defined character and line limits.

#### Scenario: Enforce text_multi limits

- **WHEN** a shopper enters or pastes `text_multi` content
- **THEN** the editor preserves no more than the configured `maxLines`
- **AND** prevents checkout when the configured `maxChars` or `maxLines` limit is exceeded

### Requirement: Fixed Image Placement

The system SHALL allow configured preset selection or shopper upload only in administrator-defined image or icon blocks.

#### Scenario: Render selected icon

- **WHEN** a shopper selects an `icon_picker` option
- **THEN** the editor renders it using the block's fixed placement and fit policy
- **AND** the shopper cannot change its geometry

#### Scenario: Render uploaded artwork

- **WHEN** a shopper uploads allowed artwork through an `image_upload` block
- **THEN** the editor renders it with a cover fit clipped to the block's fixed placement and configured preview treatment
- **AND** the shopper can pan and zoom the uploaded image inside that fixed block without changing the block bounds
- **AND** the shopper cannot move, resize, rotate, or reorder the administrator-defined block itself

#### Scenario: Adjust an uploaded image crop in preview

- **WHEN** a shopper or administrator in draft Preview mode uploads an image that is larger or has a different aspect ratio than the configured block
- **THEN** the editor applies a cover baseline so the block is fully filled
- **AND** the user can drag the image within the clipped block and adjust zoom to choose the visible crop
- **AND** the stored customization value preserves the original asset plus renderer-independent crop metadata

#### Scenario: Preserve the original upload

- **WHEN** the system creates a smaller editor preview
- **THEN** it retains the original image as the production source
- **AND** never substitutes the preview derivative during production export

### Requirement: V2 Perpetual List Deferral

The system SHALL not expose TrophySmack-style perpetual/champion list personalization in v1.

#### Scenario: Do not accept perpetual list shopper values

- **WHEN** a shopper submits customization values for a v1 template
- **THEN** the backend accepts only values for published `text_single`, `text_multi`, `image_upload`, and `icon_picker` blocks plus non-rendering acknowledgements
- **AND** any `perpetual_list` value is rejected or ignored as hidden or unpublished input

### Requirement: Effective Image DPI

The system SHALL calculate image quality from the source pixels used and the physical output size.

#### Scenario: Report acceptable image quality

- **WHEN** an image's effective DPI meets the block threshold
- **THEN** the editor reports that the image is production-ready

#### Scenario: Block low-resolution artwork

- **WHEN** an image's effective DPI is below the block's threshold
- **THEN** the system identifies the affected block and layer
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
