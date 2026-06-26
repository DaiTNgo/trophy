## ADDED Requirements

### Requirement: Editor workspace layout
The admin customization editor SHALL render a document-style workspace with a top header, left vertical rail, central canvas, and right selection inspector.

#### Scenario: Template actions stay in header
- **WHEN** an administrator opens the customization editor
- **THEN** template identity, product/status context, save draft, preview, and publish actions are available from the header rather than the right inspector

#### Scenario: Inspector follows selection
- **WHEN** an administrator selects a Text layer, Image Shape layer, or no layer
- **THEN** the right inspector shows only properties for that selection state

### Requirement: Left rail tabs
The editor SHALL provide left rail tabs for Blocks, Layers, Form, and Background.

#### Scenario: Blocks require background
- **WHEN** no background is set
- **THEN** the Blocks tab does not allow new Text or Image Shape layers to be created

#### Scenario: Blocks create selected top layers
- **WHEN** an administrator creates a Text layer or selects an Image Shape type from Blocks
- **THEN** the editor creates the new layer at the center of the canvas, places it at the top of the visual stack, and selects it

### Requirement: Background management
The editor SHALL support exactly one background image per template and SHALL use its intrinsic dimensions as the canvas coordinate system.

#### Scenario: Empty canvas uploads background
- **WHEN** a template has no background
- **THEN** the canvas presents an upload/dropzone state

#### Scenario: Background replacement preserves layers
- **WHEN** an administrator replaces or removes the background
- **THEN** existing layer geometry and form fields remain unchanged

#### Scenario: Empty background click clears selection
- **WHEN** a background exists and the administrator clicks an empty canvas area
- **THEN** the editor clears the current selection and does not replace the background

### Requirement: Canvas viewport and selection
The editor SHALL support zoom, pan, fit, and reset viewport controls without changing template geometry.

#### Scenario: Coordinates remain intrinsic
- **WHEN** the canvas viewport is zoomed or panned
- **THEN** inspector position and size fields remain expressed in intrinsic background pixels

#### Scenario: Topmost canvas selection
- **WHEN** multiple visible layers overlap and the administrator clicks the overlap on the canvas
- **THEN** the editor selects the visible topmost layer at that point

### Requirement: Layers tab stack management
The Layers tab SHALL manage visual stack order, layer name, hidden state, locked state, selection, and deletion.

#### Scenario: Stack order matches panel order
- **WHEN** a layer appears above another layer in the Layers tab
- **THEN** it renders above that layer on the canvas and in output

#### Scenario: Reorder layer stack
- **WHEN** an administrator drags a layer to a new position in the Layers tab
- **THEN** the layer z-order updates without changing shopper form order

#### Scenario: Hidden layer excluded after publish
- **WHEN** an administrator hides a layer
- **THEN** the layer is excluded from shopper form rendering, preview rendering, validation output, and production output

#### Scenario: Locked layer cannot move on canvas
- **WHEN** a layer is locked
- **THEN** direct canvas move and resize interactions are disabled while selection from the Layers tab remains possible

### Requirement: Form tab shopper field management
The Form tab SHALL manage shopper-facing field order and field copy separately from visual layer stack.

#### Scenario: Form order changes shopper order only
- **WHEN** an administrator reorders fields in the Form tab
- **THEN** shopper form order changes without changing visual layer z-order

#### Scenario: Field copy belongs to Form tab
- **WHEN** an administrator edits field label, help text, placeholder, or required state
- **THEN** the linked shopper field updates without changing layer geometry

### Requirement: Text layer authoring
The editor SHALL allow administrators to create and configure Text layers with position, width, fit rules, typography policies, alignment, and text paths.

#### Scenario: Text resizes horizontally only
- **WHEN** a Text layer is selected on the canvas
- **THEN** the editor allows moving and horizontal resizing but does not allow vertical resizing

#### Scenario: Text height is derived
- **WHEN** an administrator changes max lines or max font size
- **THEN** the editor derives the Text layer height from those values

#### Scenario: Path editing mode
- **WHEN** an administrator activates custom path editing from the inspector or by double-clicking the path
- **THEN** the canvas allows creating and editing Bezier points and pauses normal layer move/resize interactions

### Requirement: Image Shape layer authoring
The editor SHALL allow administrators to create Image Shape layers from rectangle, circle, ellipse, rounded rectangle, star, and heart shapes.

#### Scenario: Shape type is fixed after creation
- **WHEN** an Image Shape layer has been created
- **THEN** the editor does not provide a control to change its shape type

#### Scenario: Aspect lock controls handles
- **WHEN** an Image Shape layer has aspect ratio lock enabled
- **THEN** canvas resize uses corner handles only and preserves the shape ratio

#### Scenario: Free shape resize
- **WHEN** an Image Shape layer has aspect ratio lock disabled
- **THEN** canvas resize provides side and corner handles for width and height changes

### Requirement: Preview dialog
The editor SHALL provide a full-screen Preview dialog that simulates the shopper customization experience for the current draft.

#### Scenario: Preview preserves editor state
- **WHEN** an administrator opens and closes Preview
- **THEN** the previous editor selection and workspace state are preserved

#### Scenario: Preview uses draft values only
- **WHEN** an administrator enters test values in Preview
- **THEN** those values do not modify template configuration

### Requirement: Delete undo and shortcuts
The editor SHALL support immediate delete with undo and basic keyboard shortcuts.

#### Scenario: Delete with undo
- **WHEN** an administrator deletes the selected layer
- **THEN** the layer is removed immediately and an Undo toast can restore the layer, form field, stack order, form order, properties, and selection

#### Scenario: Keyboard shortcuts
- **WHEN** an administrator uses Delete, Backspace, Cmd/Ctrl+Z, Esc, arrow keys, or Shift+arrow keys in the editor
- **THEN** the editor performs delete, undo delete, clear selection or exit path edit, 1 px nudge, or 10 px nudge respectively
