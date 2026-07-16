## ADDED Requirements

### Requirement: Shared customization preview exposes fullscreen viewing
The shared customization preview SHALL expose a fullscreen action that opens the current preview in a fullscreen overlay without depending on storefront-specific layout state.

#### Scenario: Shopper opens preview fullscreen
- **WHEN** a shopper activates the fullscreen action from the shared customization preview
- **THEN** the system SHALL render the current preview in a fullscreen overlay

### Requirement: Fullscreen preview preserves the current design state
The fullscreen overlay SHALL render the same active preview state as the inline shared preview, including the currently selected variant media background and customization values.

#### Scenario: Shopper opens fullscreen after making customization changes
- **WHEN** a shopper opens the fullscreen overlay after changing customization values or selected media
- **THEN** the fullscreen preview SHALL show the same current design state as the inline preview

### Requirement: Fullscreen preview remains compatible with read-only mode
The shared customization preview SHALL allow fullscreen viewing in read-only flows without revealing edit-only controls that are otherwise suppressed in read-only mode.

#### Scenario: Read-only preview opens fullscreen
- **WHEN** a read-only preview consumer activates the fullscreen action
- **THEN** the fullscreen overlay SHALL open in read-only viewing mode
- **AND** edit-only controls SHALL remain hidden

### Requirement: Fullscreen preview closes back to the inline preview
The shared customization preview SHALL let the shopper close the fullscreen overlay and return to the inline preview without losing the current preview state.

#### Scenario: Shopper closes fullscreen preview
- **WHEN** a shopper exits the fullscreen overlay
- **THEN** the inline preview SHALL remain available
- **AND** the current preview state SHALL be preserved
