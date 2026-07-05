## ADDED Requirements

### Requirement: Product owns customization configuration
The system SHALL model customization as product-owned data with at most one customization configuration per product.

#### Scenario: Customization enabled product stores one config
- **WHEN** an admin saves a product with customization enabled and a valid editor document shape
- **THEN** the system persists one customization configuration associated with that product

#### Scenario: Customization disabled product omits config
- **WHEN** an admin saves a product with customization disabled
- **THEN** the system does not persist customization layers or form fields for that product

#### Scenario: Customization lifecycle follows product lifecycle
- **WHEN** a customizable product is saved as draft or published
- **THEN** the customization configuration uses the product status and does not expose a separate template draft, publish, or revision state

### Requirement: Customization stores canvas and editor rules only
The system SHALL store product customization canvas dimensions, layers, and form fields, and MUST NOT persist independent background assets inside customization configuration.

#### Scenario: Canvas dimensions are derived from variant media
- **WHEN** an admin saves customization for a product with variant images
- **THEN** the system stores canvas width and canvas height from the first available variant image

#### Scenario: Background assets remain variant media
- **WHEN** a product customization is read back
- **THEN** its background choices are derived from ordered variant media rather than from customization background fields

### Requirement: Variant media is ordered per variant
The system SHALL persist uploaded product assets as ordered media entries for each product variant.

#### Scenario: First media item is stable
- **WHEN** a variant has multiple media entries
- **THEN** the entry with the lowest position is returned as the first image for that variant

#### Scenario: Variant media order survives reload
- **WHEN** a product with variant media is saved and then loaded again
- **THEN** each variant's media entries are returned in persisted position order

### Requirement: Full-create product endpoint saves customization flow
The system SHALL provide a product creation path that saves product details, organization data, attributes, options, variants, variant media, and optional customization in one request.

#### Scenario: Draft full-create with incomplete customization
- **WHEN** an admin saves a customizable product as draft with incomplete variant images or incomplete customization blocks
- **THEN** the system persists the product draft and any well-formed customization data

#### Scenario: Full-create omits disabled customization
- **WHEN** an admin submits product creation with customization disabled after editing temporary customization state
- **THEN** the system creates the product without product customization data

#### Scenario: Full-create returns persisted product
- **WHEN** the full-create request succeeds
- **THEN** the response includes the created product with variants, ordered variant media, and customization summary when enabled

### Requirement: Publish requires customization readiness
The system SHALL block publishing a customizable product unless Customization Publish Readiness is satisfied.

#### Scenario: Publish blocked when a variant has no image
- **WHEN** an admin publishes a customizable product and any created variant has no media entries
- **THEN** the system rejects publish with a validation error explaining that each variant needs an image

#### Scenario: Publish blocked when image dimensions differ
- **WHEN** an admin publishes a customizable product and any variant image has dimensions different from the customization canvas
- **THEN** the system rejects publish with a validation error explaining that all variant images must share the same size

#### Scenario: Publish blocked when editor model is invalid
- **WHEN** an admin publishes a customizable product and the customization layers or form fields are invalid
- **THEN** the system rejects publish with a validation error explaining the customization issue

#### Scenario: Publish succeeds when readiness is satisfied
- **WHEN** an admin publishes a customizable product where every created variant has at least one image, all variant images share dimensions, and customization is valid
- **THEN** the system publishes the product and its product-owned customization together

### Requirement: Admin create product exposes customization after variants
The admin create product flow SHALL show a customization switch in Details and SHALL show the Customization tab after Variants only when customization is enabled.

#### Scenario: Switch enables customization tab
- **WHEN** an admin turns on customization in Details
- **THEN** the create product flow shows a Customization tab to the right of Variants

#### Scenario: Switch disabled hides customization tab
- **WHEN** an admin leaves customization disabled
- **THEN** the create product flow does not show the Customization tab

#### Scenario: Temporary state is not submitted when disabled
- **WHEN** an admin turns customization on, edits customization, turns customization off, and submits the product
- **THEN** the submitted product is not customizable

### Requirement: Admin blocks customization tab until variant media is ready
The admin create product flow SHALL prevent entering the Customization tab until every variant selected for creation has at least one image and uploaded images satisfy the background size contract.

#### Scenario: Missing variant image blocks navigation
- **WHEN** customization is enabled and a created variant has no image
- **THEN** the admin cannot enter the Customization tab and sees guidance to upload at least one image for each variant

#### Scenario: Dimension mismatch blocks navigation
- **WHEN** customization is enabled and variant images have different pixel dimensions
- **THEN** the admin cannot enter the Customization tab and sees guidance that all images must share the same size

#### Scenario: Ready variant media allows navigation
- **WHEN** customization is enabled, every created variant has at least one image, and all images share dimensions
- **THEN** the admin can enter the Customization tab

### Requirement: Embedded editor uses variant images as preview backgrounds
The embedded create-product customization editor SHALL use variant media as admin preview backgrounds and SHALL save through product submission only.

#### Scenario: Background panel lists variant images
- **WHEN** an admin opens the embedded editor Background panel
- **THEN** the panel lists uploaded variant images that can be selected for preview checks

#### Scenario: Preview background selection is not persisted as customization asset
- **WHEN** an admin switches the editor preview background
- **THEN** only the admin preview canvas changes and no independent customization background asset is saved

#### Scenario: Editor has no standalone template actions
- **WHEN** the customization editor is embedded in create product
- **THEN** it does not show standalone template save, publish, or revision controls

### Requirement: Storefront preview follows selected variant
The storefront SHALL render customization preview on the selected variant's first image and SHALL NOT expose a separate background picker.

#### Scenario: Selected variant changes preview background
- **WHEN** a shopper selects a different product variant on a customizable product
- **THEN** the customization preview background updates to that variant's first media image

#### Scenario: Customization placement remains stable
- **WHEN** a shopper changes between variants whose images satisfy the background size contract
- **THEN** customization layers remain in the same intended positions relative to the product blank

#### Scenario: No customization background picker
- **WHEN** a shopper customizes a product
- **THEN** the customization form does not offer a separate background selection control
