## ADDED Requirements

### Requirement: Category visibility is persisted
The system SHALL persist one visibility state for every product category using the values `public` and `hidden`. New categories SHALL default to `public`, and existing categories without an explicit value SHALL resolve as `public`.

#### Scenario: New category defaults to public
- **WHEN** an admin creates a category without selecting a visibility override
- **THEN** the category is stored and returned with visibility `public`

#### Scenario: Existing category remains visible by default
- **WHEN** an existing category has no stored visibility value
- **THEN** admin and storefront behavior treats the category as `public`

### Requirement: Admin can manage category visibility
The admin category list and detail surfaces SHALL display the category visibility, and the category create/edit flows SHALL allow an admin to choose `Public` or `Hidden`. This control SHALL be available for system categories.

#### Scenario: Admin hides a category
- **WHEN** an admin saves a category with visibility `hidden`
- **THEN** the backend persists `hidden` and the admin list and detail surfaces show `Hidden`

#### Scenario: Admin makes a category public
- **WHEN** an admin saves a category with visibility `public`
- **THEN** the backend persists `public` and the category is eligible for storefront category surfaces

#### Scenario: System category visibility is editable
- **WHEN** an admin edits a system category
- **THEN** the visibility control remains enabled even though protected identity fields remain restricted

### Requirement: Hidden categories are excluded from storefront category surfaces
The storefront SHALL exclude hidden categories from category navigation, category listing data, category filter options, and direct category routes. A direct request for a hidden category SHALL return `404`.

#### Scenario: Hidden category is absent from navigation
- **WHEN** storefront navigation data is loaded and a category is hidden
- **THEN** the hidden category is not returned as a navigation option

#### Scenario: Hidden category is absent from product filters
- **WHEN** the storefront loads category filter options and a category is hidden
- **THEN** the hidden category is not returned as a selectable filter

#### Scenario: Direct hidden category route returns not found
- **WHEN** a shopper requests `/categories/:categoryHandle` for a hidden category
- **THEN** the storefront responds with `404`

### Requirement: Category visibility does not change product visibility
The system SHALL NOT unpublish or hide a product merely because one of its categories is hidden. Products SHALL remain eligible for existing public product surfaces when their own publication rules and another public discovery path allow them.

#### Scenario: Product remains in another public category
- **WHEN** a product belongs to one hidden category and one public category
- **THEN** the product remains discoverable through the public category

#### Scenario: Product category relationship is retained
- **WHEN** an admin hides a category that has assigned products
- **THEN** the category-product relationships remain unchanged
