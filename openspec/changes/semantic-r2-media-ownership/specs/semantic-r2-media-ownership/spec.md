## ADDED Requirements

### Requirement: New media uses semantic owner namespaces
The system SHALL create new shopper, catalog, order, clipart, and font objects under semantic owner-oriented R2 prefixes. Object keys SHALL not contain shopper names, phone numbers, or entered customization text.

#### Scenario: A shopper uploads an image for a customization field
- **WHEN** the storefront accepts a shopper image upload for a draft
- **THEN** it stores the source under `shopper-drafts/{draft-id}/uploads/{field-id}/{asset-id}.source.{ext}` and stores an optional preview as a peer rendition

#### Scenario: An operator uploads variant media
- **WHEN** the admin attaches a newly uploaded media asset to a persisted variant
- **THEN** it stores the source under that product and variant's catalog namespace

### Requirement: Catalog media uses final product and variant ownership
The system SHALL use the final product and variant R2 namespaces supplied by `multipart-product-full-create` for newly created catalog media.

#### Scenario: A product is created with variant media
- **WHEN** `multipart-product-full-create` creates a Product and Variant media asset
- **THEN** the asset uses `catalog/products/{product-id}/variants/{variant-id}/`

#### Scenario: A Product Draft is published
- **WHEN** an operator publishes a Product Draft created with final catalog media
- **THEN** the system changes product status without moving its R2 objects

### Requirement: Product reference media can use product or variant ownership
The system SHALL allow Product Reference Media to represent either a product-owned upload or a reference to a variant-owned media asset without duplicating the referenced variant object.

#### Scenario: A variant asset is selected for the product gallery
- **WHEN** an operator adds a variant-owned asset to Product Reference Media
- **THEN** the product gallery stores an association to that asset and no second R2 object is created

#### Scenario: The selected thumbnail asset is removed
- **WHEN** an operator removes the asset selected as Product Thumbnail
- **THEN** the system clears the thumbnail and does not select a fallback gallery item

### Requirement: Permanent deletion removes owned catalog media
The system SHALL remove all product-owned catalog records, media records, and R2 objects under the product prefix when a Product is permanently deleted.

#### Scenario: A product is permanently deleted
- **WHEN** an operator permanently deletes a trashed Product
- **THEN** the system deletes `catalog/products/{product-id}/` and associated catalog asset records while preserving order-owned media

### Requirement: Legacy object keys remain readable
The system SHALL continue to read existing asset records from their persisted legacy object keys and SHALL NOT migrate them as part of this change.

#### Scenario: A legacy product asset is requested
- **WHEN** a record created before this change is served
- **THEN** the system retrieves the object using its stored legacy key
