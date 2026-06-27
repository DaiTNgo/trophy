## ADDED Requirements

### Requirement: CSS clip-path rendering for vector shapes
The system SHALL render vector image shape layers using CSS `clip-path: path('...')`. The SVG path `d` attribute SHALL be derived from the layer's `vectorPath.points` array.

#### Scenario: Render corner point path
- **WHEN** a vector layer has only `corner` points
- **THEN** the DOM clip-path SHALL be a path with `M` (first point) and `L` (subsequent points) commands, with `Z` if `closed:true`

#### Scenario: Render smooth point path
- **WHEN** a vector layer has `smooth` points with handles
- **THEN** the DOM clip-path SHALL use `C` (cubic Bézier) commands where both prev.outHandle and current.inHandle exist, and `L` commands where no handles exist

### Requirement: Admin editor canvas preview
The editor canvas SHALL render vector shape outlines (stroke) and fill semi-transparent, matching the existing image shape preview style (teal bg).

#### Scenario: Preview in editor
- **WHEN** a vector layer is rendered in the editor canvas
- **THEN** it SHALL show a semi-transparent teal fill clipped to the vector path, with the path outline visible when selected

### Requirement: Admin Preview dialog rendering
The admin Preview dialog SHALL render vector layers using the same CSS clip-path mechanism as the editor, applied to uploaded shopper images.

#### Scenario: Preview with uploaded image
- **WHEN** a shopper uploads an image to a vector shape layer in the Preview dialog
- **THEN** the image SHALL be clipped to the vector path shape

### Requirement: SVG export for vector shapes
The backend SVG export SHALL convert vector points to an SVG `<clipPath>` element with a `<path d="..." />` child.

#### Scenario: SVG export
- **WHEN** an SVG is exported for a design containing a vector shape layer
- **THEN** the SVG SHALL include a `<clipPath>` with `<path>` using the computed `d` attribute, and the image SHALL use `clip-path="url(#...)"`

### Requirement: Scale path to pixel dimensions
The `vectorPointsToSvgPathD()` function SHALL scale point coordinates from ratio space (0-1) to pixel space using the layer's `widthRatio * background.widthPx` and `heightRatio * background.heightPx`.

#### Scenario: Scale to pixels
- **WHEN** `vectorPointsToSvgPathD()` is called with points using ratio coordinates
- **THEN** each point's `xRatio`/`yRatio` is multiplied by the layer's pixel width/height respectively

### Requirement: PDF export
The PDF export SHALL skip vector clip-path rendering, drawing the full image without clipping, since pdf-lib does not support native clip paths on images. This is an accepted limitation.

#### Scenario: PDF export fallback
- **WHEN** a PDF is exported for a design containing a vector shape layer
- **THEN** the image SHALL be drawn in full without clip-path
