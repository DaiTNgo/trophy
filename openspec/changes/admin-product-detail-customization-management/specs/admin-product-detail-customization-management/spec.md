## ADDED Requirements

### Requirement: Admin product detail uses backend product reads
The admin product detail page SHALL load its product from the admin route surface instead of browser-local catalog state.

#### Scenario: Product detail loads a backend-created product
- **WHEN** an admin opens `/products/:productId` for a product created through the backend full-create endpoint
- **THEN** the page displays the product fields, variants, ordered variant media, and product customization data returned by `GET /api/admin/products/:id`

#### Scenario: Product detail survives browser reload
- **WHEN** an admin reloads a product detail page for a backend-created product
- **THEN** the page still displays the product from the backend rather than reporting it missing from local mock state

#### Scenario: Missing product displays not found
- **WHEN** `GET /api/admin/products/:id` returns not found
- **THEN** the admin product detail page displays a not-found state with navigation back to products

### Requirement: Product create redirects to product detail
The admin create product flow SHALL navigate to the created product detail page after a successful product creation.

#### Scenario: Create draft opens detail
- **WHEN** an admin successfully creates a draft product
- **THEN** the admin app navigates to `/products/:productId` for the created product

#### Scenario: Create published product opens detail
- **WHEN** an admin successfully creates and publishes a product
- **THEN** the admin app navigates to `/products/:productId` for the created product

### Requirement: Product detail uses section-specific saves
The admin product detail page SHALL save edits through section-specific admin routes instead of re-submitting the full-create payload.

#### Scenario: Overview saves through product patch
- **WHEN** an admin edits overview fields on product detail and saves
- **THEN** the admin app sends only overview fields to the product overview update route and refreshes the product from the response

#### Scenario: Organization saves through organize route
- **WHEN** an admin edits collection, categories, type, or tags on product detail and saves
- **THEN** the admin app sends only organization fields to the product organize update route and refreshes the product from the response

#### Scenario: Customization saves through customization route
- **WHEN** an admin enables, disables, or edits product customization from product detail
- **THEN** the admin app sends the customization change to a product customization update route for that product

### Requirement: Product detail shows customization section
The admin product detail page SHALL include a Customization section for viewing and managing product-owned customization.

#### Scenario: Non-customizable product shows enable action
- **WHEN** an admin opens product detail for a product without product customization
- **THEN** the Customization section shows customization as disabled and provides an action to enable it

#### Scenario: Customizable product shows summary
- **WHEN** an admin opens product detail for a product with product customization
- **THEN** the Customization section shows enabled state, canvas size, layer count, form field count, and readiness status

#### Scenario: Readiness issues are visible
- **WHEN** a customizable product has missing variant media, mismatched image dimensions, or invalid customization data
- **THEN** the Customization section displays the readiness issue that would block publish

### Requirement: Product detail opens full-screen customization editor
The admin product detail Customization section SHALL open a full-screen or route-level editor for product-owned customization editing.

#### Scenario: Edit action opens product customization editor
- **WHEN** an admin clicks the customization edit action from product detail
- **THEN** the admin app opens an editor route scoped to that product

#### Scenario: Editor uses variant media backgrounds
- **WHEN** the product customization editor is opened from product detail
- **THEN** the editor uses ordered variant media as preview background choices and does not expose independent customization background upload

#### Scenario: Editor returns to detail after save
- **WHEN** an admin saves customization from the product customization editor
- **THEN** the editor persists through the product customization route and returns to or refreshes the product detail view

### Requirement: Product detail can enable customization after creation
The admin product detail page SHALL allow admins to enable product-owned customization for an existing product.

#### Scenario: Enable creates default draft
- **WHEN** an admin enables customization on an existing product
- **THEN** the system initializes product customization from the default editor template and derives canvas dimensions from the first available variant image when one exists

#### Scenario: Draft can enable before ready
- **WHEN** an admin enables customization on a draft product whose variant media are incomplete
- **THEN** the system saves the customization draft and reports readiness issues without publishing the product

#### Scenario: Published enable must be ready
- **WHEN** an admin enables customization on a published product
- **THEN** the system saves the change only if the product satisfies Customization Publish Readiness after the enable action

### Requirement: Product detail can disable customization after creation
The admin product detail page SHALL allow admins to disable product-owned customization for an existing product.

#### Scenario: Disable removes shopper customization
- **WHEN** an admin disables customization on a customizable product
- **THEN** storefront product reads no longer expose shopper customization for that product

#### Scenario: Published product can disable customization
- **WHEN** an admin disables customization on a published customizable product
- **THEN** the system saves the product as a published non-customizable product

### Requirement: Published product edits preserve customization readiness
The system MUST prevent product detail saves from breaking Customization Publish Readiness for a published customizable product.

#### Scenario: Published media mismatch is rejected
- **WHEN** an admin saves variant media changes on a published customizable product and the resulting variant images have mismatched dimensions
- **THEN** the backend rejects the save with a conflict error and leaves the persisted product unchanged

#### Scenario: Published missing media is rejected
- **WHEN** an admin saves variant changes on a published customizable product and a created variant would have no media
- **THEN** the backend rejects the save with a conflict error and leaves the persisted product unchanged

#### Scenario: Published invalid customization is rejected
- **WHEN** an admin saves invalid customization layers or form fields on a published customizable product
- **THEN** the backend rejects the save with a conflict error and leaves the persisted product unchanged

#### Scenario: Draft readiness-breaking edit is allowed
- **WHEN** an admin saves incomplete variant media or incomplete customization on a draft product
- **THEN** the backend saves the draft and returns readiness issues without publishing the product

### Requirement: Product list links backend products to detail
The admin product list SHALL render products from the admin product route surface and link each row to its backend product detail page.

#### Scenario: Product list shows backend-created product
- **WHEN** an admin opens the product list after creating a product through the backend
- **THEN** the list includes the backend-created product and links to `/products/:productId`

#### Scenario: Search filters backend product list
- **WHEN** an admin searches in the product list
- **THEN** the list queries or filters products from the backend admin product catalog rather than the browser-local mock catalog
