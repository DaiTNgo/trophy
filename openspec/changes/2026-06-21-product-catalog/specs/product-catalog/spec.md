## ADDED Requirements

### Requirement: Product Detail Fields
The system SHALL support a product record with a required title and optional subtitle, description, media, and attributes.

#### Scenario: Create product with minimal input
- **WHEN** an admin creates a product with only a title
- **THEN** the system creates the product successfully
- **AND** the system creates a default variant

#### Scenario: Create product without handle
- **WHEN** an admin omits the handle during product creation
- **THEN** the system generates a handle from the title
- **AND** the stored handle is unique

### Requirement: Variant-Owned Pricing
The system SHALL store price on product variants only.

#### Scenario: Product without variant mode
- **WHEN** an admin creates a product with variants disabled
- **THEN** the product still has exactly one default variant
- **AND** price is stored on that variant

### Requirement: Variant Option Separation
The system SHALL separate variant options from descriptive attributes.

#### Scenario: Define options and attributes
- **WHEN** an admin defines `Size` and `Color` options and defines `width` and `weight` attributes
- **THEN** options are used to determine valid variants
- **AND** attributes remain descriptive metadata only

### Requirement: Organize Relations
The system SHALL support optional Medusa-like organize fields.

#### Scenario: Assign organize metadata
- **WHEN** an admin assigns type, collection, categories, and tags
- **THEN** the product stores one optional type
- **AND** one optional collection
- **AND** zero or more categories
- **AND** zero or more tags

### Requirement: Publish Validation
The system SHALL validate product completeness before publish.

#### Scenario: Reject publish without variant price
- **WHEN** any variant is missing a valid price
- **THEN** publish is rejected

#### Scenario: Reject duplicate variant combination
- **WHEN** two variants under the same product share the same option-value combination
- **THEN** the system rejects the save
