## ADDED Requirements

### Requirement: Admin authors clipart scope at the category boundary
The customization editor SHALL let admins configure clipart-capable layers using a category-scope rule instead of an asset allow list.

#### Scenario: Admin locks a layer to one fixed category
- **WHEN** an admin selects the `Fixed category` rule for a clipart-capable layer
- **THEN** the editor MUST require exactly one clipart category for that layer
- **AND** the layer MUST not require an asset allow list or default clipart asset

#### Scenario: Admin allows multiple categories
- **WHEN** an admin selects the `Allowed categories` rule for a clipart-capable layer
- **THEN** the editor MUST allow selection of one or more clipart categories
- **AND** the layer MUST not require an asset allow list or default clipart asset

### Requirement: Clipart options derive from selected categories at runtime
The system SHALL derive available clipart assets from the categories configured on the layer instead of from template-authored asset allow lists.

#### Scenario: Fixed category derives clipart options
- **WHEN** a clipart-capable layer is configured with a fixed category
- **THEN** admin preview and storefront selection MUST show clipart assets from that category only

#### Scenario: Allowed categories derive clipart options
- **WHEN** a clipart-capable layer is configured with allowed categories
- **THEN** admin preview and storefront selection MUST let the user work within those categories only
- **AND** the template MUST not need a persisted default category or default clipart asset

### Requirement: Validation enforces active category readiness
The system SHALL validate clipart-capable layers using category readiness rules rather than default asset completeness.

#### Scenario: Fixed category must be active
- **WHEN** a clipart-capable layer uses the `Fixed category` rule
- **THEN** validation MUST fail if the referenced category is missing or inactive

#### Scenario: Allowed categories require at least one active category
- **WHEN** a clipart-capable layer uses the `Allowed categories` rule
- **THEN** validation MUST fail if the layer has no active allowed categories

#### Scenario: No default asset is required
- **WHEN** a clipart-capable layer has valid active category scope
- **THEN** validation MUST NOT require a default clipart asset
- **AND** validation MUST NOT require a template-authored asset allow list
