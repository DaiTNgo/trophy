## ADDED Requirements

### Requirement: Published variants synchronize to MISA independently
The backend SHALL use the string form of each Trophy variant ID as MISA `product_code`. It SHALL send `product_name` as `Product title - Variant title`, `inactive: false`, `usage_unit: "Cái"`, `product_properties: "Hàng hóa"`, and `form_layout: "Mẫu tiêu chuẩn"`. It SHALL attempt synchronization when a product is created as published, changes from draft to published, receives a new variant while published, or has a product/variant name changed while published.

#### Scenario: Publish creates missing MISA products
- **WHEN** an admin publishes a valid Trophy product whose variant IDs are not present in MISA
- **THEN** the backend creates one MISA product per variant and records each successful variant as `synced`

#### Scenario: Publish is idempotent for existing MISA codes
- **WHEN** an admin publishes a valid Trophy product whose variant ID already exists in MISA
- **THEN** the backend does not create a duplicate MISA product and still completes the Trophy publish

#### Scenario: Published name changes update MISA
- **WHEN** an admin changes a product or variant name on a published product
- **THEN** the backend sends a MISA `PUT /Products` form for the affected MISA product code

#### Scenario: Admin manually synchronizes a published variant
- **WHEN** an admin chooses Sync MISA for a variant on a published product
- **THEN** the backend synchronizes only that variant and returns its `synced` or `failed` result without changing the product's publication state

#### Scenario: Draft variants cannot be manually synchronized
- **WHEN** a manual variant MISA synchronization request targets a draft product
- **THEN** the backend returns a conflict and does not call MISA

#### Scenario: MISA rejects one product operation
- **WHEN** MISA returns an HTTP or logical validation failure
- **THEN** the backend keeps the local Trophy save or publish, records `failed` and the error on the affected variant, and continues processing other variants

### Requirement: Trophy stores the MISA product identifier
After successful product synchronization, the backend SHALL resolve each MISA product's numeric ID and store it in the operator-provided `product_variants.misa_product_id` column, together with `misa_sync_status`, `misa_last_error`, and `misa_synced_at`.

#### Scenario: Store IDs for newly created products
- **WHEN** MISA returns numeric IDs for the published variant product codes
- **THEN** the corresponding Trophy variants contain those IDs

#### Scenario: Existing product IDs are backfilled during synchronization
- **WHEN** a MISA product already exists by variant-ID code but its Trophy variant has no stored ID
- **THEN** the backend stores the existing MISA numeric ID on the Trophy variant

### Requirement: Product deletion removes MISA and Trophy records safely
The backend SHALL reject deletion for products or variants referenced by an order, delete a synced MISA product by its stored MISA ID before deleting its local record, and retain unsynced local records without a MISA delete call.

#### Scenario: Delete uses stored IDs
- **WHEN** every variant has a stored numeric MISA product ID and the product has no order references
- **THEN** the backend deletes those MISA IDs directly and then removes the local product relations and product

#### Scenario: Delete an unsynced variant
- **WHEN** a variant is not synchronized and has no order references
- **THEN** the backend deletes the local variant without calling MISA

#### Scenario: Delete protects ordered products
- **WHEN** an order item references the product
- **THEN** the backend returns a conflict and does not delete either the MISA product or the Trophy product
