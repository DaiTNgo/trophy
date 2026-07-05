## ADDED Requirements

### Requirement: Product detail exposes Medusa-like variant management sections
The admin product detail page SHALL present option, variant, price, stock, and variant media management as section actions or row actions instead of one combined full-replace form.

#### Scenario: Operator views variant management
- **WHEN** an operator opens a product detail page with variants
- **THEN** the page shows a variants management surface with actions for managing options, variant details, prices, stock, and media based on Trophy product fields

#### Scenario: Product detail excludes Medusa-only fields
- **WHEN** an operator edits variant management data
- **THEN** the UI only exposes Trophy product model fields and does not require Medusa-only fields such as EAN, UPC, barcode, region price matrices, inventory locations, or inventory kits

### Requirement: Options are managed without destructive variant regeneration
The admin product detail option management flow SHALL update product option definitions and option values without automatically regenerating or replacing the product's variant set.

#### Scenario: Option value is added
- **WHEN** an operator adds a value to a product option from product detail
- **THEN** the option value is saved and existing variants remain unchanged

#### Scenario: Option value is still used by a variant
- **WHEN** an operator attempts to delete an option value that is referenced by an existing variant
- **THEN** the backend rejects the delete with a conflict response and existing variants remain unchanged

#### Scenario: Option title is updated
- **WHEN** an operator updates a product option title from product detail
- **THEN** only the option title changes and variant prices, stock, media, SKU, and option selections remain unchanged

### Requirement: Variants are managed through explicit row actions
The admin product detail variant management flow SHALL create, update, and delete product variants through explicit variant operations that do not overwrite unrelated variant fields.

#### Scenario: Variant details are updated
- **WHEN** an operator updates a variant's title, SKU, option selections, or allow-backorder setting
- **THEN** the backend updates only those submitted detail fields and preserves the variant's price, stock, and media

#### Scenario: Variant is created
- **WHEN** an operator creates a variant with a valid set of option value selections
- **THEN** the backend creates one purchasable variant row with the submitted Trophy fields

#### Scenario: Duplicate option combination is rejected
- **WHEN** an operator creates or updates a variant to use an option value combination already used by another variant on the product
- **THEN** the backend rejects the request with a conflict response and existing variants remain unchanged

### Requirement: Prices are edited through price-specific operations
The admin product detail price management flow SHALL update variant prices through price-specific single or bulk operations and MUST NOT submit full variant objects for price-only edits.

#### Scenario: Bulk prices are saved
- **WHEN** an operator saves price edits for multiple variants
- **THEN** the backend updates only the submitted price values for those variants and preserves each variant's title, SKU, option selections, stock, backorder setting, and media

#### Scenario: Price update references an unknown variant
- **WHEN** a price update references a variant that does not belong to the product
- **THEN** the backend rejects the request and does not apply partial price updates

### Requirement: Stock is edited through stock-specific operations
The admin product detail stock management flow SHALL update variant inventory through stock-specific single or bulk operations and MUST NOT submit full variant objects for stock-only edits.

#### Scenario: Bulk stock is saved
- **WHEN** an operator saves inventory quantity edits for multiple variants
- **THEN** the backend updates only the submitted inventory quantities for those variants and preserves each variant's title, SKU, option selections, price, backorder setting, and media

#### Scenario: Stock update contains invalid quantity
- **WHEN** a stock update submits a negative or non-numeric inventory quantity
- **THEN** the backend rejects the request and existing inventory quantities remain unchanged

### Requirement: Variant media keeps Trophy customization semantics
The admin product detail variant media management flow SHALL manage media attached to Trophy variants and preserve its use as customization background data.

#### Scenario: Variant media is updated
- **WHEN** an operator updates media for one variant
- **THEN** the backend updates only that variant's media ordering or membership and preserves the variant's title, SKU, option selections, price, stock, and backorder setting

#### Scenario: Published customizable product loses required media
- **WHEN** an operator attempts to remove variant media from a published customizable product in a way that violates customization publish readiness
- **THEN** the backend rejects the request with a conflict response and existing variant media remains unchanged

### Requirement: Product detail does not use full-replace APIs for routine variant management
The admin product detail implementation MUST NOT use full-replace options or variants APIs for routine option, variant, price, stock, or media edit actions.

#### Scenario: Routine option edit is submitted
- **WHEN** an operator changes an option title, adds a value, edits a value, or deletes an unused value from product detail
- **THEN** the admin client calls an operation-specific option endpoint and does not call a full-replace options endpoint

#### Scenario: Routine variant edit is submitted
- **WHEN** an operator edits variant details, prices, stock, or media from product detail
- **THEN** the admin client calls an operation-specific variant endpoint and does not call a full-replace variants endpoint
