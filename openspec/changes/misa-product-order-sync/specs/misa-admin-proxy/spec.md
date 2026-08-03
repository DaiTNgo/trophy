## ADDED Requirements

### Requirement: Admin can proxy MISA product operations
The backend SHALL expose protected admin-only proxy routes for listing, creating, updating, and deleting MISA products, acquiring MISA bearer tokens server-side and never returning the token to the browser.

#### Scenario: List MISA products
- **WHEN** an authenticated admin requests the MISA products proxy
- **THEN** the backend returns normalized MISA product data

#### Scenario: Proxy rejects unauthenticated access
- **WHEN** a request has no valid admin session
- **THEN** the backend returns an authorization error without calling MISA

#### Scenario: Proxy forwards a product mutation
- **WHEN** an authenticated admin submits a valid create, update, or delete payload
- **THEN** the backend obtains a token, calls the matching MISA endpoint, and returns the operation result without token data

### Requirement: Admin can inspect MISA products in a standalone screen
The admin app SHALL provide a separate MISA Products route with search, refresh, product code display, and copy-code behavior without changing the Trophy product editor.

#### Scenario: Search MISA products
- **WHEN** an admin enters a product code or name query
- **THEN** the screen requests the MISA proxy and displays matching products

#### Scenario: Copy product code
- **WHEN** an admin activates copy on a MISA product
- **THEN** the product code is copied to the clipboard and the UI shows completion feedback
