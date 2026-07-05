## ADDED Requirements

### Requirement: Text on path block creation
The admin customization editor SHALL provide a dedicated Text on path creation action in the Blocks panel.

#### Scenario: Create closed path text layer
- **WHEN** an administrator clicks `Text on path` in the Blocks panel after a background exists
- **THEN** the editor creates a Text layer centered on the canvas with a closed ellipse path, selects it, places it at the top of the visual stack, and creates its linked shopper form field

#### Scenario: Background required
- **WHEN** no background is set
- **THEN** the Text on path creation action is disabled or unavailable like other renderable block creation actions

### Requirement: Closed ellipse path model
Text on path layers SHALL persist path data as a closed ellipse or oval path.

#### Scenario: Serialized closed path
- **WHEN** a Text on path layer is serialized
- **THEN** its text path stores a closed ellipse type with normalized bounds, start angle, direction, and side or flip orientation

#### Scenario: No open path modes
- **WHEN** a Text on path layer is created through the Text on path block
- **THEN** it does not use an open arc path, Pen path, or custom Bezier point path

### Requirement: Text on path is one line
Text on path layers SHALL render and validate as one-line text.

#### Scenario: Max lines locked
- **WHEN** an administrator selects a Text on path layer
- **THEN** the inspector shows max lines as fixed at `1` or otherwise prevents configuring more than one line

#### Scenario: Runtime line enforcement
- **WHEN** shopper input for a Text on path field contains line breaks
- **THEN** runtime rendering treats the value as one line before fitting it to the closed path

### Requirement: Closed path canvas editing
The admin canvas SHALL allow direct editing of the selected Text on path ellipse.

#### Scenario: Selected path shows handles
- **WHEN** an administrator selects a Text on path layer in Edit mode
- **THEN** the canvas shows the ellipse path outline, resize handles, and a start-position handle

#### Scenario: Resize ellipse path
- **WHEN** an administrator drags an ellipse resize handle
- **THEN** the layer's closed ellipse bounds update without changing shopper text content

#### Scenario: Move text path layer
- **WHEN** an administrator drags the selected Text on path layer body
- **THEN** the whole ellipse path and rendered text move together

#### Scenario: Adjust text start position
- **WHEN** an administrator drags the start-position handle around the ellipse
- **THEN** the layer's start angle updates and rendered text repositions along the closed path

### Requirement: Closed path inspector controls
The inspector SHALL expose text and path controls appropriate for closed ellipse Text on path layers.

#### Scenario: Text controls remain inspector-only
- **WHEN** an administrator edits Text on path content, sample text, min font size, max font size, color, or alignment
- **THEN** those edits happen in the inspector and not through direct canvas text editing

#### Scenario: Flip path orientation
- **WHEN** an administrator activates the closed path flip or orientation control
- **THEN** the text changes between the configured inside/outside or direction orientation while remaining on the same closed ellipse bounds

### Requirement: Closed path runtime rendering
Runtime rendering SHALL render Text on path layers consistently across admin Preview, storefront preview, and backend export paths.

#### Scenario: Path-aware alignment
- **WHEN** a Text on path layer uses left, center, or right alignment
- **THEN** rendering resolves that alignment along the closed ellipse path relative to the configured start angle

#### Scenario: Fit then trim
- **WHEN** Text on path content is too long for the closed path at the maximum font size
- **THEN** rendering reduces font size no lower than the configured minimum and then silently trims overflow if the text still does not fit

#### Scenario: Published output excludes hidden layer
- **WHEN** a Text on path layer is hidden
- **THEN** admin Preview, storefront preview, validation output, and backend export output exclude that layer like other hidden layers
