## ADDED Requirements

### Requirement: Unified Public Asset Retrieval
The system SHALL expose all asset retrieval endpoints (Products, Brands, Customizations) via a single top-level public router at `/api/assets`.

#### Scenario: Fetching a product asset without authentication
- **WHEN** a client makes a `GET` request to `/api/assets/products/:id/content`
- **THEN** the system returns the asset binary directly from storage without checking for an admin session or store context.

#### Scenario: Fetching a customization asset
- **WHEN** a client makes a `GET` request to `/api/assets/customizations/:id/content`
- **THEN** the system returns the asset binary directly from storage without checking for an admin session or store context.

### Requirement: Asset URL Generation
The system SHALL return public capability URLs when generating asset representations for both Admin and Storefront responses.

#### Scenario: Product serialization
- **WHEN** the backend serializes a product variant containing media assets
- **THEN** the `contentUrl` for each media asset must be formatted as `/api/assets/products/:id/content`.

### Requirement: Admin Media Component Rendering
The Admin frontend SHALL render standard media without relying on authenticated Blob fetches.

#### Scenario: Admin views a standard product image
- **WHEN** the `<AdminMedia>` component receives a standard image `src` (e.g. `/api/assets/products/...`)
- **THEN** it renders an `<img>` tag with the normalized source, allowing the browser to natively fetch and cache the unauthenticated image.
