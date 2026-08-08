## ADDED Requirements

### Requirement: Full product creation accepts one multipart command
The system SHALL accept Product data and all new variant media in one authenticated multipart full-create request. The request SHALL map every submitted file to exactly one media declaration in the product payload.

#### Scenario: Operator saves a draft with multiple variant files
- **WHEN** the admin submits a valid multipart full-create request
- **THEN** the backend creates the product, variants, and their declared media through that one command

#### Scenario: A file mapping is invalid
- **WHEN** a media declaration has no matching file, has more than one matching file, or a file is not declared
- **THEN** the backend returns a validation error and creates no Product or R2 object

### Requirement: Full-create writes final semantic media paths
The system SHALL create Product and Variant IDs internally before writing each accepted media file directly to its final semantic R2 path.

#### Scenario: A variant media file is accepted
- **WHEN** full-create accepts a file mapped to a variant gallery or customization-media declaration
- **THEN** it stores the object under that created product and variant namespace without a staging copy

### Requirement: Full-create compensates on failure
The system SHALL remove newly created Product records and successfully written final R2 objects when any post-validation full-create step fails.

#### Scenario: An R2 write fails after product rows exist
- **WHEN** one media object cannot be written after Product and Variant records are created
- **THEN** the backend compensates created D1 records and written R2 objects, returns an error, and does not expose a partial Product

### Requirement: Admin retains pending files after failed full-create
The admin create-product flow SHALL retain selected file objects and form values after a failed full-create response.

#### Scenario: Save fails because one media upload fails
- **WHEN** full-create returns an error
- **THEN** the create-product form remains populated and the operator can submit it again without selecting unchanged files again
