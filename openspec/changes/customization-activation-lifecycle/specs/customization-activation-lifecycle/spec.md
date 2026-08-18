## ADDED Requirements

### Requirement: Initial customization activation is an atomic setup session
For a product without saved customization, the Admin Product Detail SHALL open
an unsaved Customization Setup Session rather than immediately enabling
customization. The session SHALL stage a valid template and one Customization
Background file for every current variant. The activation command SHALL validate
the complete staged input, including the Background Size Contract, before
creating the customization record or any submitted background asset.

#### Scenario: Operator completes first-time setup for a published product
- **WHEN** an operator activates customization from a published product that
  has no saved customization and submits a valid template plus a same-sized
  Customization Background for every current variant
- **THEN** the system atomically creates the template and backgrounds, marks
  customization active, and leaves the product published

#### Scenario: Operator cancels initial setup
- **WHEN** an operator closes or cancels a first-time Customization Setup
  Session before successful activation
- **THEN** the system persists no customization record and creates no
  background asset from the staged files

#### Scenario: Initial setup has invalid or incomplete backgrounds
- **WHEN** the initial activation command is missing a current variant
  background or contains backgrounds that violate the Background Size Contract
- **THEN** the system rejects the command without persisting a customization
  record or any submitted background asset

### Requirement: Active customization requires complete valid backgrounds
The system SHALL treat customization as active only when its saved
configuration is enabled and every current variant has a valid Customization
Background that satisfies the shared Background Size Contract. Backend command
validation SHALL be authoritative even when the Admin UI has validated a file
locally.

#### Scenario: Server rejects a client-bypassed invalid background
- **WHEN** an activation or active-customization variant-create request reaches
  the backend with a background whose dimensions differ from the established
  Background Size Contract
- **THEN** the backend rejects the request and does not leave a partial active
  customization or partial variant result

### Requirement: Deactivation retains saved customization work
An operator SHALL be able to deactivate active customization without deleting
the customization record, template, form configuration, Customization
Background assets, Product Media references, or Product Thumbnail selection.
While customization is deactivated, the storefront SHALL not treat the product
as customizable.

#### Scenario: Operator deactivates customization
- **WHEN** an operator deactivates active customization
- **THEN** the system retains the saved template and all Customization
  Background assets, marks customization inactive, and does not alter the
  product thumbnail even when it references a retained background

#### Scenario: Deactivated customization is absent from shopper flow
- **WHEN** a shopper views a published product with saved but deactivated
  customization
- **THEN** the storefront uses the ordinary non-customization purchase flow

### Requirement: Deactivated variant media management excludes customization backgrounds
Variant Media Management SHALL display and mutate Gallery Media independently.
While a product's customization is deactivated, it SHALL not display,
replace, upload, or remove retained Customization Backgrounds through Variant
Media Management.

#### Scenario: Operator manages media while customization is deactivated
- **WHEN** an operator opens Manage Media for a variant on a product with
  deactivated customization
- **THEN** the interface exposes Gallery Media actions only and does not expose
  the retained Customization Background

### Requirement: Reactivation repairs only what is missing
When an operator requests reactivation, the system SHALL reactivate immediately
if the retained template and every current variant background remain valid. If
one or more current variants lack a valid background, the Admin UI SHALL open a
FocusModal repair session for only those variants. A successful repair command
SHALL validate all submitted files and activate atomically; failure or cancel
SHALL keep customization deactivated and preserve existing retained data.

#### Scenario: Direct reactivation remains valid
- **WHEN** an operator reactivates deactivated customization and every current
  variant already has a valid same-sized background
- **THEN** the system activates customization without opening a repair modal or
  changing retained assets

#### Scenario: Reactivation requires backgrounds for variants added while inactive
- **WHEN** an operator reactivates deactivated customization after adding a
  variant without a Customization Background
- **THEN** the system opens a repair session that requests a background for the
  missing variant and keeps customization deactivated until the repair succeeds

#### Scenario: Reactivation repair is rejected atomically
- **WHEN** a repair session submits a missing background that is invalid or
  does not satisfy the shared Background Size Contract
- **THEN** the system rejects the repair, retains prior saved data, and keeps
  customization deactivated

### Requirement: Variant creation preserves active customization validity
The Admin Product Detail SHALL create a variant through an Atomic Variant
Creation flow with Information and Media tabs. When customization is active,
the Media tab SHALL require a valid Customization Background and may include
optional Gallery Media; the backend SHALL create the variant and its submitted
media atomically. When customization is deactivated, a new variant SHALL be
allowed without a Customization Background.

#### Scenario: Operator creates a variant while customization is active
- **WHEN** an operator submits valid variant information, optional Gallery
  Media, and a Customization Background that meets the existing size contract
- **THEN** the system atomically creates the variant and its media while
  keeping customization active

#### Scenario: Active-customization variant creation omits a background
- **WHEN** an operator tries to save a new variant on an active customizable
  product without a Customization Background
- **THEN** the system rejects creation and does not create the variant or any
  submitted Gallery Media asset

#### Scenario: Deactivated customization permits a background-less variant
- **WHEN** an operator creates a variant while customization is deactivated
  without a Customization Background
- **THEN** the system saves the variant and leaves customization deactivated

### Requirement: Permitted variant deletion preserves active customization
The system SHALL permit deletion of a variant from an active customizable
product whenever the existing variant-deletion constraints allow it. It SHALL
remove that variant's Customization Background with the variant and SHALL keep
customization active for the remaining variants.

#### Scenario: Operator deletes a permitted variant from active customization
- **WHEN** an operator deletes a variant that passes the existing
  variant-deletion constraints from an active customizable product
- **THEN** the system removes the variant and its Customization Background and
  keeps customization active for the remaining valid variants

### Requirement: Permanent customization deletion is explicit and complete
The Admin UI SHALL expose permanent customization deletion only after
customization is deactivated and SHALL require an explicit destructive
confirmation. On confirmation, the system SHALL remove the saved customization
record, template layers, form fields, translations, every variant
Customization Background association and its R2/D1 asset, and Product Media
references to those deleted assets. It SHALL clear the Product Thumbnail when
it references a deleted background, and SHALL retain unrelated Gallery Media.

#### Scenario: Active customization cannot be permanently deleted
- **WHEN** customization is active
- **THEN** the interface does not offer permanent deletion and the backend
  rejects a direct permanent-deletion command

#### Scenario: Operator confirms permanent deletion after deactivation
- **WHEN** an operator confirms `Delete customization permanently` for a
  deactivated customization
- **THEN** the system performs the defined customization and background asset
  cleanup and leaves no saved customization configuration

#### Scenario: Permanent deletion clears a background thumbnail only
- **WHEN** permanent deletion removes a Customization Background selected as
  the Product Thumbnail
- **THEN** the system clears the Product Thumbnail and retains any unrelated
  Gallery Media and their references
