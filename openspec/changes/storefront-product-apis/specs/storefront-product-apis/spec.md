## ADDED Requirements

### Requirement: Storefront product APIs are public and published-only
The system SHALL expose dedicated storefront product APIs that require no authentication and return only published products.

#### Scenario: Listing excludes non-published products
- **WHEN** a shopper requests the storefront product listing
- **THEN** the response includes published products and excludes draft or archived products

#### Scenario: Matching draft product is hidden from search
- **WHEN** a shopper searches for text that matches a draft product
- **THEN** the storefront product listing does not include that draft product

#### Scenario: Unpublished detail handle returns not found
- **WHEN** a shopper requests storefront product detail for a product that is not published
- **THEN** the system returns a not found response

#### Scenario: Storefront product APIs require no session
- **WHEN** a request without auth credentials calls a storefront product API
- **THEN** the system processes the request as a public read

### Requirement: Storefront product listing supports browse, search, category filtering, and pagination
The system SHALL provide a storefront product listing endpoint that supports text search, category filtering, page, and limit query parameters.

#### Scenario: Browse published product listing
- **WHEN** a shopper requests the storefront product listing without filters
- **THEN** the response includes a page of published product listing items with pagination metadata

#### Scenario: Search matches product browsing fields
- **WHEN** a shopper searches with a text query matching product title, subtitle, handle, or category name
- **THEN** the response includes matching published product listing items

#### Scenario: Search is part of listing
- **WHEN** a shopper searches for products
- **THEN** the storefront uses the product listing endpoint with a text query rather than a separate search endpoint

#### Scenario: Category filter uses category handle
- **WHEN** a shopper filters the storefront product listing by category handle
- **THEN** the response includes published products linked to that category

#### Scenario: Pagination returns requested page
- **WHEN** a shopper requests a valid page and limit
- **THEN** the response includes `items`, `page`, `limit`, and `total` for that result set

### Requirement: Storefront listing items use a compact shopper-facing read model
The system SHALL return compact listing items that contain only the data needed for storefront product cards and browsing.

#### Scenario: Listing item contains card fields
- **WHEN** a shopper requests the storefront product listing
- **THEN** each item includes product id, title, subtitle, handle, price amount, price-from indicator, thumbnail, category or type summary, and customizable state

#### Scenario: Listing omits full product graph
- **WHEN** a shopper requests the storefront product listing
- **THEN** listing items do not include full variants, full option values, full attributes, customization layers, or customization form fields

#### Scenario: Customizable product is marked
- **WHEN** a published product has product-owned customization enabled
- **THEN** the listing item indicates that the product is customizable

### Requirement: Storefront listing price follows Contact Price rules
The system SHALL derive storefront listing price from product variants and represent products without public variant prices as Contact Price.

#### Scenario: Lowest variant price is returned
- **WHEN** a published product has one or more variants with price amounts
- **THEN** the listing item price amount is the lowest non-null variant price

#### Scenario: Multiple variants indicate starting price
- **WHEN** a published product has multiple variants or multiple public price amounts
- **THEN** the listing item indicates that the displayed amount is a starting price

#### Scenario: Missing numeric price is Contact Price
- **WHEN** no variant for a published product has a price amount
- **THEN** the listing item returns a null price amount to represent Contact Price

### Requirement: Storefront listing thumbnail follows variant media fallback
The system SHALL derive storefront listing thumbnails from ordered variant media using a deterministic fallback order.

#### Scenario: Default variant first media is thumbnail
- **WHEN** a published product's default variant has ordered media
- **THEN** the listing item thumbnail uses the default variant's first media item

#### Scenario: Thumbnail falls back to first variant with media
- **WHEN** a published product's default variant has no media and another variant has media
- **THEN** the listing item thumbnail uses the first media item from the first variant with media

#### Scenario: Missing media returns null thumbnail
- **WHEN** no variant for a published product has media
- **THEN** the listing item thumbnail is null

### Requirement: Storefront product detail loads published products by handle
The system SHALL provide a storefront product detail endpoint that loads published products by handle and returns the data needed for the product detail page.

#### Scenario: Published detail returns full shopper product data
- **WHEN** a shopper requests a published product by handle
- **THEN** the response includes listing fields, description, attributes, options, variants, ordered variant media, and product-owned customization data when available

#### Scenario: Missing handle returns not found
- **WHEN** a shopper requests a handle that does not match a product
- **THEN** the system returns a not found response

#### Scenario: Variant media order is preserved
- **WHEN** a shopper requests product detail for a product with variant media
- **THEN** each variant's media is returned in persisted position order

#### Scenario: Product-owned customization is returned without standalone template lifecycle
- **WHEN** a shopper requests detail for a customizable product
- **THEN** the response includes product-owned customization data without standalone template draft, publish, or revision fields

### Requirement: Storefront product routes consume public backend APIs
The storefront SHALL load product listing and product detail data from the dedicated public storefront product APIs instead of mock product arrays.

#### Scenario: Product listing route loads backend listing
- **WHEN** a shopper opens the storefront product listing route
- **THEN** the route loader requests the public storefront product listing API and renders its results

#### Scenario: Product detail route loads backend detail
- **WHEN** a shopper opens a storefront product detail route by handle
- **THEN** the route loader requests the public storefront product detail API and renders its result

#### Scenario: Contact Price renders contact action
- **WHEN** the storefront receives a listing or detail product with a null price amount
- **THEN** the storefront presents a contact action instead of a numeric price
