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

### Requirement: Variant Media Separation
The system SHALL support variant-specific media separate from product-level media.

#### Scenario: Store shared product media
- **WHEN** an admin uploads product-level media for a product
- **THEN** the system stores that media on the product root
- **AND** the media is available as shared product imagery

#### Scenario: Store variant-specific media
- **WHEN** an admin uploads media for a specific variant
- **THEN** the system stores that media as media associated with that variant
- **AND** the media does not become shared product-root media by default

#### Scenario: Use variant media for visual disambiguation
- **WHEN** two variants differ visually
- **THEN** the system can return different media per variant
- **AND** shopper-facing clients can show the correct imagery for the selected variant instead of relying only on shared product media

### Requirement: Variant-Owned Pricing
The system SHALL store price on product variants only.

#### Scenario: Product without variant mode
- **WHEN** an admin creates a product with variants disabled
- **THEN** the product still has exactly one default variant
- **AND** price is stored on that variant
- **AND** variant-specific media can still be attached to that default variant

### Requirement: Variant Option Separation
The system SHALL separate variant options from descriptive attributes.

#### Scenario: Define options and attributes
- **WHEN** an admin defines `Size` and `Color` options and defines `width` and `weight` attributes
- **THEN** options are used to determine valid variants
- **AND** attributes remain descriptive metadata only

### Requirement: Organize Relations
The system SHALL support optional Medusa-thin organize fields.

#### Scenario: Assign organize metadata
- **WHEN** an admin assigns collection and categories
- **THEN** the product stores one optional collection
- **AND** zero or more categories

#### Scenario: Keep full-Medusa organize features out of v1
- **WHEN** product catalog v1 is implemented
- **THEN** the product model does not require sales channels, shipping profiles, or inventory kits
- **AND** the v1 price model does not require multi-region or multi-currency pricing

### Requirement: Publish Validation
The system SHALL validate product completeness before publish.

#### Scenario: Reject publish without variant price
- **WHEN** any variant is missing a valid price
- **THEN** publish is rejected

#### Scenario: Reject duplicate variant combination
- **WHEN** two variants under the same product share the same option-value combination
- **THEN** the system rejects the save
