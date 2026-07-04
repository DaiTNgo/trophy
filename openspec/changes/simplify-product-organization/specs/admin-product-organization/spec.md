## ADDED Requirements

### Requirement: Admin organization uses categories for Shop by Product
The admin product organization workflow SHALL use product categories as the Shop by Product assignment, and Shop by Product categories MUST be treated as a flat shopper-facing product-kind list.

#### Scenario: Create product shows Shop by Product categories
- **WHEN** an admin opens the create product Organize step
- **THEN** the form presents category assignment as the product's Shop by Product placement

#### Scenario: Product can belong to multiple Shop by Product categories
- **WHEN** an admin assigns more than one category to a product
- **THEN** the system saves all selected category links for that product

#### Scenario: Shop by Product remains flat
- **WHEN** an admin assigns Shop by Product categories
- **THEN** the form does not require selecting a nested category path

### Requirement: Admin organization uses collection for Shop by Interest
The admin product organization workflow SHALL use product collection as the Shop by Interest assignment.

#### Scenario: Create product shows Shop by Interest collection
- **WHEN** an admin opens the create product Organize step
- **THEN** the form presents collection assignment as the product's Shop by Interest placement

#### Scenario: Product has one Shop by Interest collection
- **WHEN** an admin selects a collection for a product
- **THEN** the system saves at most one collection assignment for that product

### Requirement: Type is not a primary product organization input
The admin create and edit product organization workflows SHALL NOT present product type as a primary organization input.

#### Scenario: Create product omits type
- **WHEN** an admin opens the create product Organize step
- **THEN** the form does not show a Type input

#### Scenario: New product can be saved without type
- **WHEN** an admin submits a product with categories and collection but no type
- **THEN** the system saves the product without requiring a type value

#### Scenario: Existing type data is not required for editing
- **WHEN** an admin edits an existing product that has no type
- **THEN** the form can be saved without adding a type value

### Requirement: Tags are not a primary product organization input
The admin create and edit product organization workflows SHALL NOT present tags as a primary organization input until a concrete tag purpose is introduced.

#### Scenario: Create product omits tags
- **WHEN** an admin opens the create product Organize step
- **THEN** the form does not show a Tags input

#### Scenario: New product can be saved without tags
- **WHEN** an admin submits a product with categories and collection but no tags
- **THEN** the system saves the product without requiring tag values

#### Scenario: Existing tag data does not block editing
- **WHEN** an admin edits an existing product that has no tags
- **THEN** the form can be saved without adding tag values

### Requirement: Storefront browsing semantics follow admin organization
The storefront SHALL interpret categories as Shop by Product and collections as Shop by Interest for product browsing surfaces.

#### Scenario: Shop by Product filter uses category handle
- **WHEN** a shopper browses a Shop by Product group
- **THEN** the storefront product listing filters products by category handle

#### Scenario: Shop by Interest uses collection data
- **WHEN** a shopper browses a Shop by Interest group
- **THEN** the storefront uses collection data rather than product type or freeform tags
