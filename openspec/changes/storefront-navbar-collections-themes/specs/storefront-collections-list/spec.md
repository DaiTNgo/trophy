## ADDED Requirements

### Requirement: Storefront exposes a public collections listing endpoint

The system SHALL expose a public `GET /api/storefront/collections` endpoint that returns all collections ordered by their position.

#### Scenario: List returns all collections

- **WHEN** a shopper requests the storefront collections listing
- **THEN** the response returns a JSON array of collection objects with id, title, handle, description, imageUrl

#### Scenario: Collection order follows position field

- **WHEN** a shopper requests the storefront collections listing
- **THEN** the collections are returned in ascending position order

#### Scenario: Collections API requires no auth

- **WHEN** a request without auth credentials calls the collections listing API
- **THEN** the system processes the request as a public read
