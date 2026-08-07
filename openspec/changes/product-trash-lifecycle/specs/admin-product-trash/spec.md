## ADDED Requirements

### Requirement: Soft delete moves an active Product to Product Trash
The admin Product deletion endpoint SHALL soft-delete an active Product by setting its deletion timestamp and SHALL retain the Product's catalog data, handle, variants, and MISA identifiers. It MUST return the soft-deleted Product or a typed error response.

#### Scenario: Admin soft-deletes a published Product
- **WHEN** an authenticated admin sends `DELETE /api/admin/products/:id` for an active published Product
- **THEN** the Product SHALL enter Product Trash and SHALL no longer be available through active admin or storefront Product reads

#### Scenario: Admin deletes an already trashed Product from the active endpoint
- **WHEN** an authenticated admin sends `DELETE /api/admin/products/:id` for a Product already in Product Trash
- **THEN** the endpoint SHALL return a typed not-found response and SHALL not alter the Product

### Requirement: Active catalog reads exclude trashed Products
The normal admin Product list and Product detail endpoints SHALL return only Products whose deletion timestamp is null. Shopper catalog endpoints SHALL continue to exclude trashed Products even if they were published before deletion.

#### Scenario: Admin lists active Products after soft deletion
- **WHEN** an authenticated admin requests the normal Product list after a Product has been soft-deleted
- **THEN** the response SHALL omit the trashed Product

#### Scenario: Shopper requests a formerly published trashed Product
- **WHEN** a shopper requests the detail or listing entry for a published Product that has entered Product Trash
- **THEN** the storefront route SHALL not expose that Product

### Requirement: Admin can list Product Trash
The admin API SHALL provide a dedicated authenticated Trash listing endpoint that returns only Products with a deletion timestamp. The list response SHALL include the fields required to identify and manage the Product, including its ID, title, handle, status, and deletion timestamp.

#### Scenario: Admin opens an empty Product Trash
- **WHEN** an authenticated admin requests the Trash listing and no Products are trashed
- **THEN** the endpoint SHALL return a successful empty items list

#### Scenario: Unauthenticated caller requests Product Trash
- **WHEN** an unauthenticated caller requests the Trash listing
- **THEN** the admin route surface SHALL reject the request according to the existing admin-session contract

### Requirement: Restoring a Product returns it as Draft
The admin API SHALL restore only a trashed Product. Restoration MUST clear its deletion timestamp and set its status to `draft`; it MUST NOT automatically publish the Product or trigger MISA synchronization.

#### Scenario: Admin restores a previously published Product
- **WHEN** an authenticated admin restores a trashed Product whose status was published before soft deletion
- **THEN** the Product SHALL return to the active catalog with status `draft`

#### Scenario: Admin restores an active Product
- **WHEN** an authenticated admin attempts to restore a Product that is not in Product Trash
- **THEN** the endpoint SHALL return a typed not-found response and SHALL not change the Product

### Requirement: Permanent deletion is available only from Product Trash
The admin API SHALL permanently delete only a trashed Product. It MUST remove the Product's dependent catalog data and SHALL permit deletion even if historical Order Items reference its ID, because Orders are retained as snapshots.

#### Scenario: Admin permanently deletes a trashed Product with historical Orders
- **WHEN** an authenticated admin permanently deletes a trashed Product referenced by historical Order Items
- **THEN** the endpoint SHALL remove the Product and dependent catalog data while leaving Order Items and their snapshots intact

#### Scenario: Admin attempts permanent deletion of an active Product
- **WHEN** an authenticated admin calls the permanent deletion endpoint for an active Product
- **THEN** the endpoint SHALL return a typed not-found response and SHALL retain the Product

### Requirement: MISA cleanup occurs only on permanent deletion
Soft deletion SHALL not remove synchronized MISA Product Records. Permanent deletion SHALL attempt MISA cleanup for synchronized variants before removing local catalog data, and SHALL preserve the trashed Product if MISA cleanup fails.

#### Scenario: Admin soft-deletes a Product with synchronized MISA variants
- **WHEN** an authenticated admin soft-deletes a Product with synchronized MISA variants
- **THEN** the endpoint SHALL not call MISA deletion

#### Scenario: MISA cleanup fails during permanent deletion
- **WHEN** MISA rejects cleanup for a synchronized variant during permanent deletion
- **THEN** the endpoint SHALL return an error and the Product SHALL remain in Product Trash

### Requirement: Admin Trash screen supports recovery and permanent deletion
The admin application SHALL expose a `/products/trash` route from a Products-page action. The screen SHALL list trashed Products and provide Restore and Delete permanently actions, require explicit confirmation before permanent deletion, and show loading, empty, and error states.

#### Scenario: Admin navigates from Products to Trash
- **WHEN** an admin selects the Product Trash action on the Products page
- **THEN** the application SHALL navigate to `/products/trash` and load the trashed Product list

#### Scenario: Admin restores a Product in Trash
- **WHEN** an admin selects Restore for a trashed Product
- **THEN** the Product SHALL disappear from Trash and return to the active catalog as Draft

#### Scenario: Admin cancels permanent deletion
- **WHEN** an admin dismisses the permanent-deletion confirmation
- **THEN** the application SHALL retain the Product in Trash
