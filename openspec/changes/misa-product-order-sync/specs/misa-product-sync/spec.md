## ADDED Requirements

### Requirement: Product publish synchronizes SKU variants to MISA
The backend SHALL require a non-empty SKU for every variant, check existing MISA products by `product_code`, create missing products with only `product_code`, `product_name`, and `inactive: false`, and mark the Trophy product published only after MISA synchronization succeeds.

#### Scenario: Publish creates missing MISA products
- **WHEN** an admin publishes a valid Trophy product whose variant SKUs are not present in MISA
- **THEN** the backend creates one MISA product per variant and changes the Trophy product status to `published`

#### Scenario: Publish is idempotent for existing MISA codes
- **WHEN** an admin publishes a valid Trophy product whose SKU already exists in MISA
- **THEN** the backend does not create a duplicate MISA product and still completes the Trophy publish

#### Scenario: Publish rejects a missing SKU
- **WHEN** any variant has no SKU
- **THEN** the backend returns a validation error and leaves the Trophy product unpublished

#### Scenario: MISA rejects product creation
- **WHEN** MISA returns an HTTP or logical validation failure
- **THEN** the backend returns an integration error containing the MISA failure and leaves the Trophy product unpublished

### Requirement: Trophy stores the MISA product identifier
After successful product synchronization, the backend SHALL resolve each MISA product's numeric ID and store it in the operator-provided `product_variants.misa_product_id` column.

#### Scenario: Store IDs for newly created products
- **WHEN** MISA returns numeric IDs for the published variant product codes
- **THEN** the corresponding Trophy variants contain those IDs

#### Scenario: Existing product IDs are backfilled during publish
- **WHEN** a MISA product already exists by code but its Trophy variant has no stored ID
- **THEN** the backend stores the existing MISA numeric ID on the Trophy variant

### Requirement: Product deletion removes MISA and Trophy records safely
The backend SHALL reject deletion for products referenced by an order, delete the corresponding MISA products before deleting local Trophy records, and use stored MISA IDs before falling back to SKU lookup for legacy variants.

#### Scenario: Delete uses stored IDs
- **WHEN** every variant has a stored numeric MISA product ID and the product has no order references
- **THEN** the backend deletes those MISA IDs directly and then removes the local product relations and product

#### Scenario: Delete falls back for legacy variants
- **WHEN** a variant lacks a stored MISA ID and the product has no order references
- **THEN** the backend resolves the MISA product by SKU before deleting it and the local product

#### Scenario: Delete protects ordered products
- **WHEN** an order item references the product
- **THEN** the backend returns a conflict and does not delete either the MISA product or the Trophy product
