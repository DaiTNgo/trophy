## ADDED Requirements

### Requirement: On-canvas quick delete button for selected layers
The `EditorCanvas` SHALL display a quick delete button directly on a selected layer when the layer is unlocked and in normal editing mode.

#### Scenario: Layer selected and unlocked
- **WHEN** an operator selects a layer on the customization editor canvas
- **THEN** an on-canvas delete button SHALL be visible floating above the top-right corner of the layer
- **AND** the button SHALL maintain a constant visual size across different canvas zoom levels

#### Scenario: Layer is locked
- **WHEN** an operator selects a locked layer (`layer.locked === true`)
- **THEN** the on-canvas delete button SHALL NOT be displayed

#### Scenario: Layer is in path editing mode
- **WHEN** an operator enters path editing mode (`pathEditing === true`) on a text-on-path or vector layer
- **THEN** the on-canvas layer delete button SHALL NOT be displayed

#### Scenario: Drawing mode is active
- **WHEN** polygon drawing mode is active (`isDrawing === true`)
- **THEN** the on-canvas delete button SHALL NOT be displayed

### Requirement: One-click layer removal from canvas
Clicking the on-canvas quick delete button SHALL immediately delete the selected layer and its associated form field without moving the layer or panning the canvas.

#### Scenario: Operator clicks the delete button
- **WHEN** the operator clicks the on-canvas delete button on a selected layer
- **THEN** the click event SHALL NOT propagate to layer drag or canvas pan handlers
- **AND** the layer and its associated customization form field SHALL be removed from the template
- **AND** a flash notification confirming deletion SHALL be displayed
- **AND** the action SHALL be reversible via the existing undo delete mechanism
