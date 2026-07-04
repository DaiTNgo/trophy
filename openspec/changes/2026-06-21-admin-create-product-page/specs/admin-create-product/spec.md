## ADDED Requirements

### Requirement: Create Product Workflow
The system SHALL provide an admin create product workflow that follows Medusa's three-tab authoring model.

#### Scenario: Open create product page
- **WHEN** an admin chooses to create a product
- **THEN** the system opens a create product workflow with the tabs `Details`, `Organize`, and `Variants`
- **AND** the system shows persistent footer actions for `Cancel`, `Save as draft`, and the current step action

#### Scenario: Move through the create workflow
- **WHEN** an admin completes the current step and continues
- **THEN** the system advances to the next tab in the order `Details` -> `Organize` -> `Variants`
- **AND** the final step action changes from `Continue` to `Publish`

### Requirement: Minimal Product Creation
The system SHALL allow creation of a draft product with minimal required input.

#### Scenario: Create product with title only
- **WHEN** an admin submits a product with only a title
- **THEN** the system creates the product successfully in draft state
- **AND** the system generates a unique handle if omitted
- **AND** the system creates a default variant

### Requirement: Details Tab Purpose
The system SHALL use the `Details` tab for core product identity, media, descriptive attributes, and variant-mode setup.

#### Scenario: Enter core product details
- **WHEN** an admin is on the `Details` tab
- **THEN** the system provides fields for `Title`, `Subtitle`, `Handle`, `Description`, and `Media`
- **AND** the system treats `Title` as the minimal required identity input

#### Scenario: Capture project-specific attributes
- **WHEN** an admin is on the `Details` tab
- **THEN** the system provides an `Attributes` area for descriptive product data
- **AND** those attributes do not participate in variant generation

#### Scenario: Use default variant mode
- **WHEN** an admin leaves `This is a product with variants` disabled
- **THEN** the system keeps the workflow in default-variant mode
- **AND** the system creates a default variant for the product if the draft or publish action succeeds

#### Scenario: Enable variants from details
- **WHEN** an admin enables `This is a product with variants`
- **THEN** the `Details` tab reveals a `Product options` authoring area
- **AND** the system allows the admin to add one or more product options
- **AND** each product option contains an option title and multiple option values

#### Scenario: Enter option values as multiple chips or tags
- **WHEN** an admin enters multiple values for an option
- **THEN** the system captures those values as distinct option values for the option
- **AND** the system allows the admin to remove an individual option value or the entire option

#### Scenario: Review generated variant values before pricing
- **WHEN** an admin has entered one or more option values while variants are enabled
- **THEN** the `Details` tab shows a `Product variants` preview area that reflects the current option-value structure
- **AND** the system allows the admin to review which generated variants will participate in variant editing before moving to the `Variants` tab

#### Scenario: Provide organize metadata
- **WHEN** an admin assigns collection and categories during create
- **THEN** the system stores those values on the new product record

### Requirement: Organize Tab Purpose
The system SHALL use the `Organize` tab for thin-scope catalog metadata rather than variant pricing.

#### Scenario: Enter organize metadata
- **WHEN** an admin is on the `Organize` tab
- **THEN** the system provides organize controls for `Collection` and `Categories`
- **AND** the system keeps those fields separate from variant row editing

#### Scenario: Exclude Medusa-full organize features from v1
- **WHEN** an admin is using the v1 create flow
- **THEN** the `Organize` tab does not require `Shipping profile`, `Sales channels`, or `Inventory kit` concepts
- **AND** those concepts do not block draft or publish

#### Scenario: Keep organize metadata optional
- **WHEN** an admin leaves optional organize metadata unset
- **THEN** the system still permits a valid draft save if the minimum create requirements are satisfied

### Requirement: Variants Tab Purpose
The system SHALL use the `Variants` tab to edit variant rows, commercial data, and variant-specific shopper-preview media.

#### Scenario: Edit a default variant row
- **WHEN** variants are disabled and an admin reaches the `Variants` tab
- **THEN** the system shows a single default variant row
- **AND** the row supports variant-level fields such as title, SKU, inventory quantity, optional backorder behavior, price inputs, and media management

#### Scenario: Edit generated variant rows
- **WHEN** variants are enabled and an admin reaches the `Variants` tab
- **THEN** the system generates variant rows from the option titles and option values defined in `Details`
- **AND** the system presents those rows in a variant editor or grid rather than a preview-card summary

#### Scenario: Enter prices in the variants tab
- **WHEN** an admin is editing variants
- **THEN** the system provides price inputs in the `Variants` tab for each variant row
- **AND** the system does not require the admin to enter publishable prices in the `Details` tab

#### Scenario: Upload media for a variant
- **WHEN** an admin is editing a variant row in the `Variants` tab
- **THEN** the system provides a variant-media management control for that variant
- **AND** the admin can upload one or more media assets that are attached to that variant only
- **AND** those media assets are separate from product-level media entered in `Details`

#### Scenario: Use variant media to disambiguate shopper preview
- **WHEN** multiple variants have different visual appearances such as different colors, prints, or finishes
- **THEN** the admin can attach different media to each variant
- **AND** the stored variant media allows shopper-facing preview to show the correct imagery for the selected variant instead of relying on shared product media

### Requirement: Options and Variants During Create
The system SHALL support option-driven variant creation during the initial product flow.

#### Scenario: Create product with variants
- **WHEN** an admin defines product options and their values during product creation
- **THEN** the system creates variants from those combinations
- **AND** variant-level prices remain attached to variants only
- **AND** variant-level media remains attached to variants only
- **AND** the resulting variant rows follow the structure defined in the `Variants` tab

#### Scenario: Reject invalid option definitions during create
- **WHEN** variants are enabled and an option is missing its title or all of its values
- **THEN** the system rejects the step transition or submit action
- **AND** the page identifies the option definition that must be corrected

#### Scenario: Reject duplicate value in one option
- **WHEN** variants are enabled and an option contains the same value more than once
- **THEN** the system rejects the option definition
- **AND** the page identifies the duplicated value problem

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
- **AND** the page identifies the blocking validation errors on the tab responsible for them

#### Scenario: Block publish when variant rows are missing commercial data
- **WHEN** the product requires variant pricing or other required variant-row fields that are not complete
- **THEN** the system blocks publish from the `Variants` tab
- **AND** the page points the admin to the blocking variant rows and fields

### Requirement: Create Product API Contract
The system SHALL expose a create product contract compatible with mock-first admin delivery and later backend implementation.

#### Scenario: Handle file uploads before submitting the product payload
- **WHEN** the admin uploads product or variant media files (e.g. PDFs, images)
- **THEN** the admin frontend MUST first upload these files to the standalone assets API (`POST /api/admin/products/assets`) to obtain an `assetId`
- **AND** the frontend MUST construct the final `full-create` JSON payload using these `assetId`s, rather than embedding raw file data or making piecemeal product update calls
- **AND** the single `full-create` API call handles all database operations (product, variants, and media linking) in one step

#### Scenario: Submit create product request
- **WHEN** the admin submits the create product flow
- **THEN** the contract accepts details, organize metadata, option definitions, and variant-row inputs
- **AND** each variant-row input can carry uploaded media references for that variant
- **AND** the response returns the normalized created product aggregate

#### Scenario: Keep create contract aligned to thin scope
- **WHEN** the create product contract is implemented
- **THEN** the contract does not require shipping-profile, sales-channel, or inventory-kit fields for v1 compatibility

#### Scenario: Separate product media from variant media in the contract
- **WHEN** the create product contract is implemented
- **THEN** the contract keeps product-level media and variant-level media as separate collections
- **AND** variant media is associated with a specific variant rather than with the product root

#### Scenario: Fulfill create contract with mock data
- **WHEN** the current admin runtime has no live backend implementation yet
- **THEN** the system can satisfy the create flow through a mock service that conforms to the same contract
