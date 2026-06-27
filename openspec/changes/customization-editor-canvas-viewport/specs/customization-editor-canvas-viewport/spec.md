## ADDED Requirements

### Requirement: Canvas mode separation
The admin customization editor SHALL provide explicit `Edit` and `View` canvas modes.

#### Scenario: Edit mode manipulates layers
- **WHEN** an administrator switches the canvas to `Edit` mode
- **THEN** canvas layer selection, unlocked layer dragging, resize handles, and custom path editing are available according to existing layer rules

#### Scenario: View mode navigates viewport
- **WHEN** an administrator switches the canvas to `View` mode
- **THEN** pointer dragging on the canvas workspace pans the viewport and does not select, move, resize, or path-edit layers

#### Scenario: Mode does not persist to template
- **WHEN** an administrator changes between `Edit` and `View` modes
- **THEN** the template background, layers, form fields, and saved draft payload remain unchanged

### Requirement: Direct zoom percentage control
The admin customization editor SHALL allow administrators to set canvas zoom by entering a numeric percentage.

#### Scenario: Admin enters zoom percentage
- **WHEN** an administrator enters a valid zoom percentage and commits the input
- **THEN** the canvas viewport zoom changes to the corresponding scale without changing template geometry

#### Scenario: Admin uses zoom buttons
- **WHEN** an administrator clicks zoom decrement or zoom increment
- **THEN** the canvas zoom changes by the configured step and the percentage input reflects the new value

#### Scenario: Invalid zoom input is rejected
- **WHEN** an administrator commits an empty, non-numeric, or out-of-range zoom value
- **THEN** the editor preserves or clamps to a valid zoom value and does not corrupt the canvas viewport

### Requirement: Fit-to-view focus
The admin customization editor SHALL provide a `Fit` action that focuses the background canvas inside the visible workspace.

#### Scenario: Fit centers visible canvas
- **WHEN** a background exists and the administrator activates `Fit`
- **THEN** the editor computes a zoom that fits the full background into the visible canvas workspace and centers it in the viewport

#### Scenario: Fit recovers from distant pan
- **WHEN** the canvas has been panned partially or fully out of view
- **THEN** activating `Fit` returns the background canvas to the visible workspace

#### Scenario: Fit preserves layer coordinates
- **WHEN** the administrator activates `Fit`
- **THEN** all inspector coordinates and saved layer geometry remain expressed in intrinsic background pixels

### Requirement: Viewport state is editor-only
Canvas zoom, pan, and mode SHALL affect only the admin editor viewport.

#### Scenario: Saving draft ignores viewport state
- **WHEN** an administrator saves a draft after changing zoom, pan, or canvas mode
- **THEN** the save payload contains template configuration only and excludes viewport zoom, pan, and mode

#### Scenario: Preview uses template state
- **WHEN** an administrator opens Preview after changing zoom, pan, or canvas mode
- **THEN** Preview renders from the draft template and form values rather than from editor viewport state
