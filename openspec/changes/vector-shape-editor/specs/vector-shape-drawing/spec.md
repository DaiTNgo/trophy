## ADDED Requirements

### Requirement: Enter draw mode
The system SHALL provide a "Draw shape" button in the Blocks panel that puts the editor canvas into draw mode. In draw mode, all existing layer interactions (drag, resize, select) SHALL be disabled.

#### Scenario: Enter draw mode
- **WHEN** admin clicks "Draw shape" in Blocks panel
- **THEN** canvas enters draw mode, a floating instruction panel appears with "Click to add points, drag for curves", and a "Close Shape" button

#### Scenario: Exit draw mode without saving
- **WHEN** admin presses Escape or clicks "Cancel" in the floating panel
- **THEN** canvas exits draw mode, any unclosed path is discarded, and normal editing resumes

### Requirement: Add corner points
The system SHALL add a `corner` point at the click position when admin clicks on the canvas in draw mode. Each point SHALL be rendered as a small circle on the canvas. Points SHALL be connected by straight lines as they are added.

#### Scenario: Add corner point
- **WHEN** admin clicks on the canvas in draw mode
- **THEN** a new `corner` point is added at the click position, and a straight line connects it to the previous point

### Requirement: Add smooth points
The system SHALL add a `smooth` point with Bézier handles when admin clicks and drags on the canvas in draw mode. The drag direction and distance SHALL determine the initial handle positions. Handles on a smooth point SHALL be linked (moving one mirror-adjusts the other).

#### Scenario: Add smooth point by click-drag
- **WHEN** admin clicks and drags on the canvas in draw mode
- **THEN** a new `smooth` point is added with inHandle and outHandle proportional to the drag vector, and a curve connects it to the previous point using the handles

### Requirement: Close and finalize path
The system SHALL close the path when admin clicks the first point or clicks the "Close Shape" button in the floating panel. A closed path SHALL connect the last point back to the first point. Once closed, the vector SHALL be finalized as an image shape layer with `type: "vector"`.

#### Scenario: Close path by clicking first point
- **WHEN** admin clicks the first point circle
- **THEN** the path is closed (Z command), a new image shape layer is created with `type: "vector"` and `vectorPath:{points,closed:true}`, draw mode exits

#### Scenario: Close path by button
- **WHEN** admin clicks "Close Shape" button and there are at least 3 points
- **THEN** the path is closed and converted to an image shape layer as above

#### Scenario: Minimum points validation
- **WHEN** admin clicks "Close Shape" with fewer than 3 points
- **THEN** nothing happens and a tooltip shows "Need at least 3 points to create a shape"

### Requirement: Undo last point during drawing
The system SHALL allow admin to undo the last added point while in draw mode via a floating "Undo" button.

#### Scenario: Undo last point
- **WHEN** admin clicks "Undo" during drawing
- **THEN** the most recently added point and its connecting line/curve are removed
