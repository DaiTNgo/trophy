## ADDED Requirements

### Requirement: Inspector point deletion for vector and polygon layers
The `VectorPointsTable` inspector SHALL provide a delete button on each point card for removing vertices from the vector path.

#### Scenario: Deleting a point when points exceed minimum
- **WHEN** an operator views a vector or polygon layer with more than 3 points in the Inspector
- **THEN** each point card SHALL show an active delete button
- **AND** clicking the delete button SHALL remove that point from `vectorPath.points` and re-index the remaining points

#### Scenario: Preventing deletion when minimum points reached
- **WHEN** the vector path has 3 or fewer points (`points.length <= 3`)
- **THEN** the delete button on all point cards SHALL be disabled
- **AND** hovering the button SHALL display an explanatory tooltip indicating a closed polygon requires at least 3 points

### Requirement: Canvas keyboard deletion constraint
The canvas keyboard deletion shortcut (`Delete` / `Backspace`) SHALL respect the minimum vertex constraint for closed vector shapes and polygons.

#### Scenario: Pressing delete on canvas with more than 3 points
- **WHEN** a vector point is selected on canvas and the path has more than 3 points
- **THEN** pressing `Delete` or `Backspace` SHALL delete the selected point

#### Scenario: Pressing delete on canvas with 3 or fewer points
- **WHEN** a vector point is selected on canvas and the path has 3 or fewer points
- **THEN** pressing `Delete` or `Backspace` SHALL NOT delete the point

### Requirement: Bidirectional selection synchronization
Selecting a point in `VectorPointsTable` SHALL highlight that point on the canvas.

#### Scenario: Clicking a point card in Inspector
- **WHEN** an operator clicks a point card in `VectorPointsTable`
- **THEN** the corresponding point SHALL be selected and highlighted on the `EditorCanvas`
