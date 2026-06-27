## ADDED Requirements

### Requirement: Select vector layer shows editable points
When a vector image shape layer is selected, the system SHALL render all vector points as draggable circles on top of the layer in the canvas. Handles SHALL be hidden by default and shown when a point is individually selected.

#### Scenario: Select vector layer
- **WHEN** admin selects a vector image shape layer in the canvas
- **THEN** all vector points appear as small draggable circles at their `xRatio`/`yRatio` positions within the layer bounds

### Requirement: Drag point to reposition
The system SHALL allow admin to drag any vector point to reposition it. Point positions SHALL update the `VectorPoint.xRatio`/`yRatio` and the clip-path SHALL update live during the drag.

#### Scenario: Drag a point
- **WHEN** admin drags a point circle on a selected vector layer
- **THEN** the point follows the pointer, xRatio/yRatio update in real time, and the clip-path re-renders to match

### Requirement: Toggle point type between corner and smooth
The system SHALL toggle a point between `corner` and `smooth` when admin double-clicks it. Switching from smooth to corner SHALL remove both handles. Switching from corner to smooth SHALL create default handles.

#### Scenario: Double-click to toggle
- **WHEN** admin double-clicks a `corner` point
- **THEN** the point changes to `smooth` with default handles (mirrored, 15% of min(layer.width, layer.height))

#### Scenario: Toggle smooth back to corner
- **WHEN** admin double-clicks a `smooth` point
- **THEN** the point changes to `corner` and both handles are removed

### Requirement: Adjust Bézier handles
When a smooth point is selected (single click), the system SHALL show its `inHandle` and `outHandle` as small blue dots with dashed lines connecting to the point. Admin SHALL be able to drag these handles to adjust the curve.

#### Scenario: Show handles on point click
- **WHEN** admin clicks a smooth point
- **THEN** the point's inHandle and outHandle appear as blue draggable dots, connected to the point with dashed lines

#### Scenario: Drag handle
- **WHEN** admin drags a handle dot
- **THEN** the handle position updates and the curve through that point re-renders live

### Requirement: Delete a point
The system SHALL delete a selected point when admin presses Backspace or Delete while a point is selected. The path SHALL reconnect the previous and next points.

#### Scenario: Delete point
- **WHEN** admin selects a point (not the first or last in an open path) and presses Delete
- **THEN** the point is removed and the path reconnects the previous and next points

### Requirement: Vector point inspector
The inspector panel SHALL show a table of all vector points when a vector layer is selected, with numeric inputs for xRatio, yRatio, inHandle x/y, outHandle x/y, and a point type selector (corner/smooth).

#### Scenario: Inspector shows points
- **WHEN** admin selects a vector image shape layer
- **THEN** the inspector shows a "Vector Points" section with a scrollable point table

#### Scenario: Edit point via inspector
- **WHEN** admin changes a numeric value in the point table
- **THEN** the point updates in the layer and the canvas clip-path re-renders
