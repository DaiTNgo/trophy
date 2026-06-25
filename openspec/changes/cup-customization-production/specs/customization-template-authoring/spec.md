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

The system SHALL associate each customization template with a cup preview asset used for block placement and shopper visualization.

#### Scenario: Upload a cup preview

- **WHEN** an administrator uploads a valid cup preview image
- **THEN** the system stores the asset and its intrinsic dimensions
- **AND** the template editor displays it without treating it as production artwork

### Requirement: Multiple Customization Blocks

The system SHALL support multiple independent typed customization blocks on one template.

#### Scenario: Define several personalization areas

- **WHEN** an administrator defines title, message, logo, and base-plate blocks
- **THEN** the system stores each block with a stable identifier and display name
- **AND** each block maintains an isolated set of rules and shopper layers

#### Scenario: Hide a block without deleting it

- **WHEN** an administrator hides a block
- **THEN** the block remains in the template with its configuration intact
- **AND** the block is excluded from shopper form rendering and preview output until it is unhidden

#### Scenario: Delete a block permanently

- **WHEN** an administrator deletes a block
- **THEN** the system removes that block and its associated configuration from the template
- **AND** the block no longer participates in shopper rendering or validation

#### Scenario: Prevent deleting a block with dependents

- **WHEN** another block visibility rule depends on the block being deleted
- **THEN** the system blocks the delete action
- **AND** tells the administrator which dependent blocks must be updated first

### Requirement: Block Preview Placement

The system SHALL store renderable block placement as normalized bounds relative to the cup preview.

#### Scenario: Display a block responsively

- **WHEN** the same template is displayed at different browser sizes
- **THEN** each block retains the same relative position and size over the cup preview

#### Scenario: Persist block placement independently from screen pixels

- **WHEN** an administrator changes a block's position or size on the current canvas
- **THEN** the editor converts the resulting pixel geometry into normalized values relative to the preview asset's intrinsic width and height
- **AND** the persisted template does not store viewport-specific pixel coordinates

### Requirement: Minimal Admin Authoring Form

The system SHALL keep the v1 admin authoring form focused on business-facing block settings rather than technical export fields.

#### Scenario: Show only fields relevant to the selected block type

- **WHEN** an administrator selects a block
- **THEN** the editor shows only the settings relevant to that block type
- **AND** the editor does not show fields belonging to other block types in the same panel

#### Scenario: Hide manual geometry inputs from the admin form

- **WHEN** an administrator edits a block in v1
- **THEN** the editor uses visual position and size interactions for placement
- **AND** the editor does not require manual entry of `x`, `y`, `width`, or `height`

#### Scenario: Hide technical export fields from the admin form

- **WHEN** an administrator edits a block in v1
- **THEN** the editor does not expose DPI, bleed, safe margin, or other technical export fields as required day-to-day inputs
- **AND** those values remain internal defaults or system-managed configuration

#### Scenario: Show block management actions in the editor

- **WHEN** an administrator selects a block
- **THEN** the editor exposes `hide/unhide` and `delete` actions for that block
- **AND** those actions are separated from the business-field inputs

### Requirement: Admin Draft Preview Mode

The system SHALL let an administrator preview and test the current template draft without leaving the admin editor.

#### Scenario: Switch from edit mode to preview mode

- **WHEN** an administrator clicks the preview action in the template editor
- **THEN** the editor switches from block-authoring mode to preview mode on the same page
- **AND** the preview mode uses the current draft template, not only the last published revision

#### Scenario: Test shopper behavior from the admin page

- **WHEN** the editor is in preview mode
- **THEN** the administrator can enter text, choose options, toggle confirmations, and upload test assets against the current draft
- **AND** the preview updates using the same block-driven rules as the shopper experience

#### Scenario: Keep draft configuration separate from preview test values

- **WHEN** an administrator interacts with preview mode
- **THEN** test inputs are stored separately from the template draft configuration
- **AND** preview-mode values do not modify block schema or placement unless the administrator returns to edit mode and changes the draft itself

#### Scenario: Rehydrate preview values from the latest draft

- **WHEN** an administrator re-enters preview mode after editing the draft
- **THEN** the editor rebuilds preview-mode default values from the latest draft configuration
- **AND** removed or hidden blocks do not continue using stale preview-mode values

### Requirement: V1 Personalization Blocks

The system SHALL allow an administrator to define ordered v1 personalization blocks directly on each customization template.

#### Scenario: Define a single-line text block

- **WHEN** an administrator adds a `text_single` block
- **THEN** the administrator configures its label, placeholder, required state, character limit, optional uppercase normalization, default value, color policy, font-family policy, and fixed placement
- **AND** the block is restricted to one line

#### Scenario: Define a bounded multi-line text block

- **WHEN** an administrator adds a `text_multi` block
- **THEN** the administrator configures its label, placeholder, required state, character limit, line limit, default value, color policy, font-family policy, and fixed placement
- **AND** the block is restricted to its configured `maxLines`

#### Scenario: Configure fixed or shopper-selectable text styles

- **WHEN** an administrator configures a text block
- **THEN** the administrator can set color as fixed or shopper-selectable
- **AND** the administrator can set font family as fixed or shopper-selectable
- **AND** shopper-selectable styles are limited to the options published on that block

#### Scenario: Define an image upload block

- **WHEN** an administrator adds an `image_upload` block
- **THEN** the administrator configures its label, required state, accepted image types, file-size limit, fit policy, monochrome preview treatment, production treatment, optional artwork-rights requirement, and fixed placement
- **AND** the block may allow shoppers to pan and zoom uploaded media only inside the fixed placement bounds

#### Scenario: Define an icon picker block

- **WHEN** an administrator adds an `icon_picker` block
- **THEN** the administrator configures revisioned icon or badge options, optional categories, an optional `none` option, and at most one default option
- **AND** each option identifies separate preview and production assets when required

#### Scenario: Exclude perpetual lists from v1

- **WHEN** an administrator defines v1 personalization blocks
- **THEN** the available renderable block types are `text_single`, `text_multi`, `image_upload`, and `icon_picker`
- **AND** the system does not expose a `perpetual_list` block until a later revision defines repeater rows, per-cell validation, plate layout, and production export behavior

#### Scenario: Define a conditional block

- **WHEN** a block is only applicable for a preceding choice
- **THEN** the administrator can define a visibility condition against an earlier compatible personalization value
- **AND** the template rejects missing or circular condition references

#### Scenario: Reject manipulable shopper geometry

- **WHEN** an administrator publishes a template
- **THEN** every renderable block has fixed preview and production placement
- **AND** no shopper value can override block position, block size, rotation, or z-index

### Requirement: Block Production Policy

The system SHALL store a production method and color expectation for each renderable block.

#### Scenario: Configure an engraving block

- **WHEN** an administrator marks a block for engraving
- **THEN** the system records the engraving method and its configured monochrome or grayscale expectation

#### Scenario: Keep production policy out of the default admin form

- **WHEN** an administrator performs day-to-day template authoring in v1
- **THEN** production policy fields are not required in the primary authoring form
- **AND** the shopper-facing behavior continues to work from the published block contract
