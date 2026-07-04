## ADDED Requirements

### Requirement: Admin route surface is canonical for operator workflows

The system SHALL expose operator backend workflows under `/api/admin/*` and SHALL NOT expose equivalent management workflows under the old generic `/api/*` management endpoints.

#### Scenario: Admin product route uses canonical path

- **WHEN** an admin caller requests the product catalog management endpoint
- **THEN** the system responds through `/api/admin/products`

#### Scenario: Old product route is removed

- **WHEN** a caller requests `/api/products`
- **THEN** the system does not route the request to product management behavior

### Requirement: Admin route surface requires admin authentication by default

The system SHALL require an authenticated admin session for `/api/admin/*` routes by default, except for explicitly unauthenticated onboarding routes.

#### Scenario: Unauthenticated admin management request

- **WHEN** a caller without an admin session requests an admin management route
- **THEN** the system rejects the request without executing management behavior

#### Scenario: Bootstrap remains available before login

- **WHEN** a caller requests `/api/admin/bootstrap` during onboarding
- **THEN** the system applies bootstrap rules without requiring an existing admin session

### Requirement: Storefront route surface is canonical for shopper runtime data

The system SHALL expose shopper-safe runtime data under `/api/storefront/*` and SHALL keep storefront product browsing under `/api/storefront/products`.

#### Scenario: Storefront product listing remains public runtime surface

- **WHEN** a storefront caller requests the shopper product listing
- **THEN** the system serves it from `/api/storefront/products`

#### Scenario: Storefront caller does not require admin endpoint for runtime data

- **WHEN** a storefront page needs published runtime data for rendering
- **THEN** the system exposes the data through a `/api/storefront/*` route rather than a `/api/admin/*` route

### Requirement: Brand assets are split by management and runtime intent

The system SHALL expose brand asset mutation and upload operations only through `/api/admin/brand-assets/*`, and SHALL expose shopper-safe brand asset reads through `/api/storefront/brand-assets/*`.

#### Scenario: Admin manages brand colors

- **WHEN** an admin caller creates or deletes a brand color
- **THEN** the system handles the request through `/api/admin/brand-assets/colors`

#### Scenario: Storefront reads brand fonts

- **WHEN** a storefront caller reads font metadata or font files for rendering
- **THEN** the system serves shopper-safe data through `/api/storefront/brand-assets/*`

### Requirement: Customization routes are split by lifecycle

The system SHALL expose customization editing, validation, asset upload, and admin export checks through `/api/admin/customizations/*`, and SHALL expose published shopper runtime customization behavior through `/api/storefront/customizations/*`.

#### Scenario: Admin edits customization data

- **WHEN** an admin caller edits or validates customization configuration
- **THEN** the system handles the request through `/api/admin/customizations/*`

#### Scenario: Storefront loads customization runtime

- **WHEN** a storefront caller loads published customization behavior for a shopper flow
- **THEN** the system handles the request through `/api/storefront/customizations/*`

### Requirement: Public system routes remain explicit

The system SHALL keep `/api/health` public and unauthenticated, and SHALL remove scaffold-only sample routes when they have no real caller.

#### Scenario: Health check is public

- **WHEN** a caller requests `/api/health`
- **THEN** the system returns health status without requiring an admin session

#### Scenario: Sample route is removed

- **WHEN** a caller requests `/api/samples`
- **THEN** the system does not expose scaffold sample behavior

### Requirement: Migration documentation maps removed endpoints

The system SHALL document removed management endpoints and their canonical replacements in a migration document.

#### Scenario: Developer looks up old route replacement

- **WHEN** a developer needs to migrate a caller from an old management endpoint
- **THEN** `docs/migrations/2026-07-04-backend-route-surfaces.md` identifies the canonical replacement or removal
