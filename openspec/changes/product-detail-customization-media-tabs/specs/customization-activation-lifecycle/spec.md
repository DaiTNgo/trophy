## ADDED Requirements

### Requirement: Setup media gates Product Detail template authoring

The Admin Product Detail initial-customization and missing-background repair
sessions SHALL present separate `Custom media` and `Custom editor` tabs. The
`Custom media` tab SHALL show each affected variant and its staged
Customization Media. The `Custom editor` tab SHALL remain disabled until every
affected variant has one staged readable Customization Media file with positive
dimensions and all staged media share the required canvas dimensions. For a
repair session, those dimensions SHALL also match the retained customization
canvas.

#### Scenario: Incomplete initial setup keeps editor unavailable

- **WHEN** an operator opens initial customization setup and one or more
  current variants lacks staged Customization Media
- **THEN** the `Custom editor` tab is disabled and the operator remains on
  `Custom media`

#### Scenario: Same-sized media enables the editor

- **WHEN** an operator stages readable Customization Media for every affected
  variant and each file has the same positive dimensions
- **THEN** the `Custom editor` tab becomes available without persisting the
  staged files

#### Scenario: Invalid replacement disables the editor again

- **WHEN** an operator removes a staged file or replaces it with media that
  fails the shared-canvas validation after opening `Custom editor`
- **THEN** the session selects `Custom media` and disables `Custom editor`

#### Scenario: Enabled editor uses the create-product workspace size

- **WHEN** staged media passes validation and an operator opens `Custom editor`
- **THEN** the embedded customization workspace uses the same available modal
  content width and height as the Create Product customization workspace
