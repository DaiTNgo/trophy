## ADDED Requirements

### Requirement: Supported catalog locales are fixed
The system SHALL support exactly the Vietnamese (`vi`) and English (`en`) catalog locales for localized shopper-facing catalog content.

#### Scenario: Unsupported locale is rejected
- **WHEN** an admin or storefront route receives localized catalog content or a locale query outside `vi` and `en`
- **THEN** the route returns a typed validation error and does not persist or return localized catalog data for that unsupported locale

#### Scenario: Pricing remains VND-only
- **WHEN** a product or variant is edited in either supported locale
- **THEN** the system preserves the same VND price fields and does not create locale-specific prices

### Requirement: Localized catalog content is persisted by canonical owner
The system SHALL persist localized catalog content for canonical catalog owners without creating language-specific products, variants, categories, collections, options, option values, attributes, or customization records.

#### Scenario: Product text has two localized values
- **WHEN** an admin saves product title, subtitle, and description values for Vietnamese and English
- **THEN** the system stores both locale values against the same product identity

#### Scenario: Option value translation keeps variant identity
- **WHEN** an admin changes the Vietnamese or English label of an option value used by variants
- **THEN** the variants remain connected to the same option value identity

#### Scenario: Customization labels are localized
- **WHEN** an admin saves shopper-facing customization form labels, placeholders, or help text in Vietnamese and English
- **THEN** the system persists those localized values without changing customization layer geometry or field identity

### Requirement: Admin routes expose editable localized fields
Admin route surfaces SHALL return and accept editable localized objects for translatable catalog fields.

#### Scenario: Admin reads localized product detail
- **WHEN** an admin loads a product detail route
- **THEN** the response includes localized values for product text, option titles, option value labels, attributes, categories, collections, and customization labels needed by the admin UI

#### Scenario: Admin updates localized option value labels
- **WHEN** an admin submits Vietnamese and English labels for a product option value
- **THEN** the route persists both labels and returns the updated localized option value in the response

#### Scenario: Vietnamese canonical value remains synced
- **WHEN** an admin updates the Vietnamese value for a localized field that still has a canonical text column
- **THEN** the route updates both the Vietnamese translation and the canonical text column used by existing read paths

### Requirement: Admin UI uses reusable localized controls
Admin UI surfaces SHALL use shared localized UI primitives or helpers for translatable fields instead of ad hoc per-screen language handling.

#### Scenario: Product option title is edited by locale
- **WHEN** an admin edits a product option title in create product or product detail
- **THEN** the UI lets the admin switch between Vietnamese and English inside the input control and saves the value for the selected locale

#### Scenario: Product option value shows both languages inline
- **WHEN** an admin edits product option values
- **THEN** each option value row or badge presents Vietnamese and English values inline without opening a separate popup

#### Scenario: Non-translatable fields stay single-value
- **WHEN** an admin edits SKU, inventory, price, handles, media, or variant identity fields
- **THEN** the UI keeps those fields as single canonical values without language controls

### Requirement: Publish requires bilingual completeness
The system SHALL block product publish attempts when required localized catalog content is missing for either Vietnamese or English.

#### Scenario: Missing English title blocks publish
- **WHEN** an admin attempts to publish a product whose required English product title is missing
- **THEN** the publish route returns a typed validation error and the product remains unpublished

#### Scenario: Missing option value translation blocks publish
- **WHEN** an admin attempts to publish a product with a variant option value missing either Vietnamese or English label
- **THEN** the publish route returns a typed validation error that identifies localized catalog content as incomplete

#### Scenario: Draft save allows incomplete translations
- **WHEN** an admin saves a draft product with incomplete Vietnamese or English localized content
- **THEN** the system saves the draft and reports translation completeness separately from draft persistence

### Requirement: Storefront routes resolve localized strings
Storefront route surfaces SHALL return shopper-facing strings resolved for the requested storefront locale.

#### Scenario: Storefront listing returns English content
- **WHEN** the storefront product listing API is requested with `locale=en`
- **THEN** product cards, category summaries, collection summaries, and other shopper-facing catalog text are returned in English when English values exist

#### Scenario: Storefront detail returns Vietnamese content by default
- **WHEN** the storefront product detail API is requested without a locale parameter
- **THEN** product, option, option value, attribute, and customization text are returned in Vietnamese

#### Scenario: Storefront locale does not affect price
- **WHEN** the same product is requested with `locale=vi` and `locale=en`
- **THEN** the returned price amount and currency code remain the same VND values

### Requirement: Orders snapshot localized shopper display text
Order creation SHALL snapshot the localized product, variant, option, and customization display text seen by the shopper at checkout.

#### Scenario: English checkout snapshots English labels
- **WHEN** a shopper checks out in the English storefront locale
- **THEN** the order item snapshot stores the English display labels alongside canonical product and variant identities

#### Scenario: Snapshot preserves canonical identities
- **WHEN** localized labels change after an order is created
- **THEN** the order item remains tied to the original product and variant IDs and keeps the display labels captured at checkout
