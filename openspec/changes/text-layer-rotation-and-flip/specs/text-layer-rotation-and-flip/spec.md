## ADDED Requirements

### Requirement: Text Layer Flip Data Model
The system SHALL support optional horizontal and vertical flip attributes on Text Layers (`flipHorizontal` and `flipVertical`), defaulting to `false` when omitted.

#### Scenario: Default text layer initialization
- **WHEN** an administrator adds a new Text Layer to a customization template
- **THEN** `flipHorizontal` and `flipVertical` are both initialized to `false` or undefined

#### Scenario: Runtime layer mapping
- **WHEN** template text layers are converted to runtime text layers
- **THEN** `flipHorizontal` and `flipVertical` values are preserved on the resulting `RuntimeTextLayer`

### Requirement: Text Layer Inspector Controls
The customization template inspector SHALL provide interactive controls for rotating and flipping the selected Text Layer.

#### Scenario: Modifying rotation angle via Inspector
- **WHEN** an administrator enters a numerical angle into the rotation degree input or clicks the +90°/-90° step buttons for a Text Layer
- **THEN** the layer's `geometry.rotationDeg` is updated to a normalized integer between `0` and `359`

#### Scenario: Toggling horizontal flip via Inspector
- **WHEN** an administrator clicks the horizontal flip toggle button for a Text Layer
- **THEN** the layer's `text.flipHorizontal` boolean value is inverted

#### Scenario: Toggling vertical flip via Inspector
- **WHEN** an administrator clicks the vertical flip toggle button for a Text Layer
- **THEN** the layer's `text.flipVertical` boolean value is inverted

### Requirement: Canvas Interactive Rotation Handle
The canvas editor SHALL render an on-canvas rotation handle for selected Text Layers that allows free-angle dragging and step snapping.

#### Scenario: Dragging canvas rotation handle
- **WHEN** an administrator drags the rotation handle of a selected Text Layer
- **THEN** the layer's `geometry.rotationDeg` continuously updates to reflect the angle between the cursor and the bounding box center

#### Scenario: Snapping rotation angle with Shift key
- **WHEN** an administrator holds the `Shift` key while dragging the canvas rotation handle
- **THEN** the resulting angle snaps to the nearest 15-degree increment (e.g. 0°, 15°, 30°, 45°, 90°)

### Requirement: Inner Content Flipping and Handle Stability
When horizontal or vertical flip is active on a Text Layer, the flip transformation SHALL apply to the rendered text content inside the layer bounding box while preserving standard resize handle directions.

#### Scenario: Dragging resize handles on a flipped text layer
- **WHEN** a Text Layer has `flipHorizontal: true` and the administrator drags the right resize handle
- **THEN** the layer's width expands from the right edge in the direction of pointer movement without inverted axis movement

### Requirement: Consistent Multi-Surface Rendering
The system SHALL render rotated and flipped Text Layers consistently across the Admin canvas editor, Storefront runtime preview, raster SVG export, and PDF export.

#### Scenario: Storefront preview of rotated and flipped text
- **WHEN** a shopper views a customizable product whose template contains rotated or flipped text
- **THEN** the text preview displays with matching rotation angle and horizontal/vertical mirroring

#### Scenario: Production PDF export
- **WHEN** an order containing rotated or flipped text is exported to PDF
- **THEN** the resulting PDF renders the text with the identical rotation angle and mirroring transformation
