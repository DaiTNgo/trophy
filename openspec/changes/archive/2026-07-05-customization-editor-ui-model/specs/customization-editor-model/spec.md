## ADDED Requirements

### Requirement: Template contract separates editor concepts
The customization template contract SHALL separate background asset, visual layers, and shopper form fields.

#### Scenario: Template contains explicit editor collections
- **WHEN** a customization template is loaded or saved
- **THEN** it contains `background`, `layers`, and `formFields` instead of a coupled block-only collection

#### Scenario: One field per renderable layer
- **WHEN** a Text or Image Shape layer exists in v1
- **THEN** the template contains one linked shopper form field for that layer

### Requirement: Background contract
The template background SHALL be nullable in drafts, singular, and required for publication.

#### Scenario: Draft without background
- **WHEN** an administrator is editing a draft template with no background
- **THEN** the template can be saved as draft

#### Scenario: Publish requires background
- **WHEN** an administrator attempts to publish a template without a background
- **THEN** validation fails

#### Scenario: Background stores intrinsic dimensions
- **WHEN** a background is set
- **THEN** the contract stores its preview URL or asset reference and intrinsic width and height in pixels

### Requirement: Layer contract
Visual layers SHALL own editor state, stack state, geometry, and type-specific render configuration.

#### Scenario: Layer common fields
- **WHEN** a layer is serialized
- **THEN** it includes id, name, type, hidden state, locked state, z-index, and normalized geometry

#### Scenario: Locked is editor-only
- **WHEN** a locked layer is rendered in storefront, validation, or production output
- **THEN** locked state has no effect on runtime output

#### Scenario: Hidden excludes runtime
- **WHEN** a layer is hidden
- **THEN** the layer and linked form field are excluded from shopper form rendering, preview rendering, validation output, and production output

### Requirement: Geometry persistence
Layer geometry SHALL persist as ratios relative to the background and SHALL be convertible to intrinsic background pixels for editor controls.

#### Scenario: Pixel edit saves ratio
- **WHEN** an administrator edits X, Y, width, or height as pixels
- **THEN** the saved geometry is normalized relative to the background intrinsic dimensions

#### Scenario: Viewport does not affect geometry
- **WHEN** the editor viewport is zoomed or panned
- **THEN** persisted geometry values remain unchanged

### Requirement: Text layer model
Text layers SHALL support sample text, max lines, min/max font size, alignment, fixed or shopper-selectable color, fixed or shopper-selectable font, and text path configuration.

#### Scenario: Text layer fit fields
- **WHEN** a Text layer is serialized
- **THEN** it includes max lines, min font size, max font size, alignment, color policy, font policy, and path configuration

#### Scenario: Invalid font size range
- **WHEN** min font size is greater than max font size
- **THEN** template validation fails

#### Scenario: Shopper selectable style validation
- **WHEN** a shopper provides a color or font value
- **THEN** validation accepts it only if it is present in the layer policy options

### Requirement: Text fitting trims overflow
Runtime text fitting SHALL reduce font size from max to min and SHALL trim overflow silently when text still cannot fit.

#### Scenario: Font size decreases to fit
- **WHEN** text fits within a Text layer after reducing font size no lower than the configured minimum
- **THEN** the renderer uses the fitted font size

#### Scenario: Text overflow trims silently
- **WHEN** text cannot fit at the configured minimum font size
- **THEN** the renderer outputs only the text that fits and does not create a validation error for overflow

#### Scenario: Max lines enforced
- **WHEN** shopper text contains more lines than the configured max lines
- **THEN** runtime rendering uses no more than the configured max lines

### Requirement: Text path model
Text paths SHALL support straight, arc up, arc down, circle top, circle bottom, and custom Bezier paths.

#### Scenario: Path text is one line
- **WHEN** a Text layer uses any non-straight path
- **THEN** validation requires max lines to equal 1

#### Scenario: Custom path points
- **WHEN** a Text layer uses a custom path
- **THEN** the path stores ordered Bezier points with anchor ratios and optional handles

#### Scenario: Path alignment
- **WHEN** text renders on a path with left, center, or right alignment
- **THEN** the alignment is resolved along path length rather than a rectangular text box

### Requirement: Image Shape layer model
Image Shape layers SHALL support fixed shape type, normalized geometry, aspect ratio lock, cover fit, and shape clipping.

#### Scenario: Supported shapes
- **WHEN** an Image Shape layer is serialized
- **THEN** its shape type is one of rectangle, circle, ellipse, rounded rectangle, star, or heart

#### Scenario: Cover fit required
- **WHEN** an Image Shape layer renders an uploaded image
- **THEN** the image uses cover fit against the shape bounds

#### Scenario: Shape clipping required
- **WHEN** an Image Shape layer renders an uploaded image
- **THEN** output is clipped to the configured shape

### Requirement: Image crop model
Image Shape uploaded values SHALL store uniform crop scale and pan ratios only.

#### Scenario: Uniform scale crop
- **WHEN** a shopper scales an uploaded image
- **THEN** the stored crop uses one uniform `cropScale` value and does not store independent horizontal or vertical scale

#### Scenario: Crop pan ratios
- **WHEN** a shopper pans an uploaded image inside the shape
- **THEN** the stored crop uses horizontal and vertical pan ratios

#### Scenario: Crop clamping
- **WHEN** crop scale or pan would move the cover image beyond valid clipped bounds
- **THEN** runtime helpers clamp the crop to valid values

### Requirement: Form field contract
Shopper form fields SHALL own shopper-facing copy, required state, and form order independently from visual layer z-order.

#### Scenario: Form order independent from z-index
- **WHEN** form field order changes
- **THEN** layer z-index remains unchanged

#### Scenario: Form field references layer
- **WHEN** a form field is serialized
- **THEN** it references an existing layer id

#### Scenario: Missing form field invalid
- **WHEN** a non-hidden renderable layer has no linked form field
- **THEN** publish validation fails

### Requirement: Design derivation
Runtime design layers SHALL be derived from template layers plus shopper form values.

#### Scenario: Visual order derives from z-index
- **WHEN** runtime render layers are built
- **THEN** visual order follows layer z-index

#### Scenario: Shopper form derives from form fields
- **WHEN** shopper form controls are built
- **THEN** control order follows form field order
