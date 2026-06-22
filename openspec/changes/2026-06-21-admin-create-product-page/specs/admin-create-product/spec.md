## ADDED Requirements

### Requirement: Create Product Page
The system SHALL provide an admin create product page that follows a Medusa-like catalog authoring flow.

#### Scenario: Open create product page
- **WHEN** an admin chooses to create a product
- **THEN** the system opens a product creation page with sectioned inputs for core catalog data

### Requirement: Minimal Product Creation
The system SHALL allow creation of a draft product with minimal required input.

#### Scenario: Create product with title only
- **WHEN** an admin submits a product with only a title
- **THEN** the system creates the product successfully in draft state
- **AND** the system generates a unique handle if omitted
- **AND** the system creates a default variant

### Requirement: Organize and Media Inputs
The system SHALL support Medusa-like organize and merchandising fields during product creation.

#### Scenario: Provide organize metadata
- **WHEN** an admin assigns collection, categories, type, and tags during create
- **THEN** the system stores those values on the new product record

#### Scenario: Provide media and descriptive data
- **WHEN** an admin supplies subtitle, description, media, or attributes
- **THEN** the system stores that data without changing variant logic

### Requirement: Options and Variants During Create
The system SHALL support option-driven variant creation during the initial product flow.

#### Scenario: Create product with variants
- **WHEN** an admin defines product options and variant combinations during product creation
- **THEN** the system creates variants from those combinations
- **AND** variant-level prices remain attached to variants only

#### Scenario: Reject duplicate variant combination during create
- **WHEN** the submitted product contains duplicate option-value combinations
- **THEN** the system rejects the create request

### Requirement: Publish Validation During Create
The system SHALL distinguish saving a draft from publishing a product.

#### Scenario: Save draft with incomplete publish data
- **WHEN** publish requirements are not yet satisfied
- **THEN** the system still allows saving the product as draft

#### Scenario: Reject invalid publish on create
- **WHEN** an admin attempts to publish during create and required publish rules fail
- **THEN** the system rejects publish
- **AND** the page identifies the blocking validation errors

### Requirement: Create Product API Contract
The system SHALL expose a create product contract compatible with mock-first admin delivery and later backend implementation.

#### Scenario: Submit create product request
- **WHEN** the admin submits the create product flow
- **THEN** the contract accepts overview, organize, media, attribute, option, and variant inputs
- **AND** the response returns the normalized created product aggregate

#### Scenario: Fulfill create contract with mock data
- **WHEN** the current admin runtime has no live backend implementation yet
- **THEN** the system can satisfy the create flow through a mock service that conforms to the same contract
