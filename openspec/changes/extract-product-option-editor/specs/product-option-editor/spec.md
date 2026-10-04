## ADDED Requirements

### Requirement: Shared Product Option Editor UI
The system SHALL provide a shared, reusable UI component for defining and editing product options across different screens (Create and Edit).

#### Scenario: Rendering the full option editor
- **WHEN** the component is rendered with `onRemove`
- **THEN** it displays the outer card layout, title input, display type selector, values editor, and a remove 'X' button

#### Scenario: Rendering in a constrained context (like a drawer)
- **WHEN** the component is rendered without `onRemove` and with `disabled=true`
- **THEN** it omits the remove 'X' button and disables all inputs and buttons

### Requirement: Unified OptionDraft State
The system SHALL use a unified `OptionDraft` type to represent the state of an option being edited.

#### Scenario: Changing a value
- **WHEN** the user updates the title translation or a value
- **THEN** the component calls `onChange` with the fully updated `OptionDraft` object
