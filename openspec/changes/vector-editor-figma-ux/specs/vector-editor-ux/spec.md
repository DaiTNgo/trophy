## ADDED Requirements

### Requirement: Vector Quick Start
The system SHALL provide a way for users to quickly insert a predefined primitive vector shape onto the canvas without drawing it point-by-point.

#### Scenario: Insert Polygon
- **WHEN** user clicks the "Add Polygon" button
- **THEN** a `vector` shape layer is inserted with points defining a regular polygon shape centered on the canvas

### Requirement: Vector Bounding Box Transform
The system SHALL allow users to scale and rotate `vector` shapes using a standard bounding box transform, instead of forcing them to move individual points.

#### Scenario: Scale Vector Shape
- **WHEN** user selects a `vector` shape layer (not in Edit mode)
- **THEN** resize handles are displayed around the bounding box
- **WHEN** user drags a resize handle
- **THEN** the bounding box and all internal vector points scale accordingly

### Requirement: Hover to Add Point
The system SHALL allow users to add new points to existing path edges while in Edit mode by clicking on the path line.

#### Scenario: Add Point to Edge
- **WHEN** user is in Edit mode for a `vector` shape
- **AND** the user hovers over an edge segment between two points
- **THEN** a preview point is displayed at the closest position on the edge
- **WHEN** the user clicks the preview point
- **THEN** a new `VectorPoint` is inserted into the path at that location

### Requirement: Corner Radius
The system SHALL support rounding sharp corner points dynamically using a `cornerRadius` property.

#### Scenario: Apply Corner Radius
- **WHEN** user selects a sharp corner `VectorPoint`
- **AND** sets the Corner Radius value in the inspector to `10`
- **THEN** the rendered SVG path smoothly arcs at that corner with a radius proportional to `10`
