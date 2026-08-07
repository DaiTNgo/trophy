## ADDED Requirements

### Requirement: Collection visibility is persisted
The system SHALL persist one visibility state for every product collection using the values `public` and `hidden`. New collections SHALL default to `public`, and existing collections without an explicit value SHALL resolve as `public`.

#### Scenario: New collection defaults to public
- **WHEN** an admin creates a collection without selecting a visibility override
- **THEN** the collection is stored and returned with visibility `public`

#### Scenario: Existing collection remains visible by default
- **WHEN** an existing collection has no stored visibility value
- **THEN** admin and storefront behavior treats the collection as `public`

### Requirement: Admin can manage collection visibility
The admin collection list and detail surfaces SHALL display collection visibility, and collection create/edit flows SHALL allow an admin to choose `Public` or `Hidden`.

#### Scenario: Admin hides a collection
- **WHEN** an admin saves a collection with visibility `hidden`
- **THEN** the backend persists `hidden` and admin collection surfaces show `Hidden`

#### Scenario: Admin makes a collection public
- **WHEN** an admin saves a collection with visibility `public`
- **THEN** the backend persists `public` and the collection becomes eligible for storefront collection surfaces

### Requirement: Hidden collections are excluded from storefront surfaces
The storefront SHALL exclude hidden collections from desktop navigation, mobile navigation, collection listing/filter data, and direct collection routes. A direct request for a hidden collection SHALL return `404`.

#### Scenario: Hidden collection is absent from desktop navigation
- **WHEN** storefront desktop navigation data is loaded and a collection is hidden
- **THEN** the hidden collection is not returned as a navigation option

#### Scenario: Hidden collection is absent from mobile navigation
- **WHEN** storefront mobile navigation data is loaded and a collection is hidden
- **THEN** the hidden collection is not returned as a navigation option

#### Scenario: Hidden collection is absent from collection listing data
- **WHEN** storefront collection listing/filter data is loaded and a collection is hidden
- **THEN** the hidden collection is not returned as a selectable collection

#### Scenario: Direct hidden collection route returns not found
- **WHEN** a shopper requests `/collections/:handle` for a hidden collection
- **THEN** the storefront responds with `404`

### Requirement: Collection visibility does not change product visibility
The system SHALL NOT unpublish or hide a product merely because one of its collections is hidden. Collection-product relationships SHALL remain unchanged when collection visibility changes.

#### Scenario: Product remains in another public collection
- **WHEN** a product belongs to one hidden collection and one public collection
- **THEN** the product remains discoverable through the public collection

#### Scenario: Hidden collection keeps assigned products
- **WHEN** an admin hides a collection that has assigned products
- **THEN** the collection-product relationships remain stored and editable in admin
