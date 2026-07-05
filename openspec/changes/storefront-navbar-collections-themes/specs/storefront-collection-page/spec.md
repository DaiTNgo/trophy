## ADDED Requirements

### Requirement: Storefront has a collection products page

The system SHALL provide a storefront route at `/collections/:handle` that displays products belonging to that collection.

#### Scenario: Collection page renders product grid

- **WHEN** a shopper navigates to `/collections/:handle` for a collection that has published products
- **THEN** the page shows a grid of product cards for that collection

#### Scenario: Empty collection shows no products

- **WHEN** a shopper navigates to `/collections/:handle` for a collection with no products
- **THEN** the page shows an empty state message and no product cards

#### Scenario: Invalid collection handle renders empty

- **WHEN** a shopper navigates to `/collections/:handle` for a non-existent collection
- **THEN** the page shows an empty state and returns 200 (not 404)

### Requirement: Collection page loads products from backend API

The collection page route loader SHALL query the existing `GET /api/storefront/collections/:handle/products` endpoint.

#### Scenario: Loader calls collection products API

- **WHEN** the collection page route loader runs for a valid handle
- **THEN** it fetches products from `GET /api/storefront/collections/:handle/products`

### Requirement: Collection page supports pagination

The collection page SHALL support pagination via `page` query parameter.

#### Scenario: Paginates through collection products

- **WHEN** a shopper views a collection with more products than the page limit
- **THEN** pagination controls are displayed to navigate additional pages
