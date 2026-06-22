## ADDED Requirements

### Requirement: Categories Tree Page
The system SHALL provide an admin categories page that follows a Medusa-like taxonomy management pattern centered on a hierarchical tree.

#### Scenario: View category tree
- **WHEN** an admin opens the categories page
- **THEN** the system shows categories in a tree or nested navigation structure
- **AND** each node can reveal its children and summary metadata

#### Scenario: Empty root category state
- **WHEN** no categories exist
- **THEN** the system shows an empty state with an action to create the first root category

### Requirement: Category Data Model
The system SHALL support categories with required title and optional handle, description, parent category, metadata, and display attributes used for catalog organization.

#### Scenario: Create root category
- **WHEN** an admin creates a category without choosing a parent
- **THEN** the system creates the category at the root level

#### Scenario: Create child category
- **WHEN** an admin creates a category and selects a parent category
- **THEN** the system stores the parent-child relationship
- **AND** the category appears under that parent in the tree

### Requirement: Hierarchy Integrity
The system SHALL preserve valid category hierarchy rules during create and edit actions.

#### Scenario: Reject cyclic move
- **WHEN** an admin tries to move a category under one of its own descendants
- **THEN** the system rejects the move

#### Scenario: Move category to a new parent
- **WHEN** an admin changes the parent of a category to another valid category or to root
- **THEN** the system persists the new position
- **AND** the updated tree structure renders correctly

### Requirement: Category Handle Rules
The system SHALL keep category handles unique within the catalog.

#### Scenario: Auto-generate handle
- **WHEN** an admin omits the handle while creating a category
- **THEN** the system generates the handle from the title

#### Scenario: Reject duplicate handle
- **WHEN** an admin submits a handle already used by another category
- **THEN** the system rejects the save with a validation error

### Requirement: Categories API Contract
The system SHALL expose category contracts compatible with mock-first admin implementation and later backend integration.

#### Scenario: Load hierarchical categories
- **WHEN** the categories page requests data
- **THEN** the system returns category records in a shape that can render a tree structure
- **AND** the contract is satisfiable by mock data in the current phase

#### Scenario: Persist hierarchy updates
- **WHEN** the admin saves category edits or reparenting changes
- **THEN** the contract supports both field updates and hierarchy changes in one save flow
