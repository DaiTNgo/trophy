## ADDED Requirements

### Requirement: Default option data is persisted for simple products
The system SHALL persist `Default option`, `Default option value`, and a default variant selecting that value when an operator creates a product without custom variation axes.

#### Scenario: Draft simple product creates default option graph
- **WHEN** an admin creates a draft product without custom options
- **THEN** the saved product includes one option titled `Default option`, one value titled `Default option value`, and one default variant selecting that value

#### Scenario: Published simple product creates default option graph
- **WHEN** an admin creates and publishes a product without custom options
- **THEN** the saved published product includes one option titled `Default option`, one value titled `Default option value`, and one default variant selecting that value

#### Scenario: Product detail renders persisted default option data
- **WHEN** an admin opens product detail for a simple product
- **THEN** the Options section shows `Default option` with `Default option value` and the Variants section shows the default variant with that option value

### Requirement: Product options and option values can be renamed in place
The system SHALL allow operators to rename existing product option titles and existing option value labels without replacing their identities.

#### Scenario: Renames default option
- **WHEN** an admin renames `Default option` to `Size`
- **THEN** the same option record is updated and variants using its values remain linked to that option

#### Scenario: Renames default option value
- **WHEN** an admin renames `Default option value` to `Small`
- **THEN** the same option value record is updated and variants using it display `Small`

#### Scenario: Rejects duplicate option value label in same option
- **WHEN** an admin renames an option value to a label already used by another value in the same option
- **THEN** the system rejects the rename with a validation error

### Requirement: Used option values can be deleted and variants become unreconciled
The system SHALL allow deleting an option value even when one or more variants currently use it, and SHALL represent affected variants as unreconciled until they are assigned valid replacement values or removed.

#### Scenario: Deletes option value used by a variant
- **WHEN** an admin deletes an option value that a variant uses
- **THEN** the option value is removed and the affected variant no longer has a valid value for that option

#### Scenario: Admin detail shows missing value
- **WHEN** an admin views a variant missing a value for a current product option
- **THEN** the variants table shows `Missing value` for the affected option

#### Scenario: Reconciles missing variant value
- **WHEN** an admin edits an unreconciled variant and assigns a valid value for the missing option
- **THEN** the variant is no longer shown with `Missing value`

#### Scenario: Deletes unreconciled variant
- **WHEN** an admin deletes a variant that has `Missing value`
- **THEN** the product no longer reports that unreconciled variant

### Requirement: Product publish readiness requires complete variant option selections
The system SHALL block product publish when any variant does not have exactly one valid value for every current product option.

#### Scenario: Blocks publish for missing option value
- **WHEN** an admin attempts to publish a product with a variant shown as `Missing value`
- **THEN** the system rejects publish and returns an error explaining that every variant needs a valid value for every option

#### Scenario: Blocks publish for duplicate option selection
- **WHEN** an admin attempts to publish a product with a variant containing duplicate values for the same option
- **THEN** the system rejects publish and returns a validation error

#### Scenario: Allows publish after reconciliation
- **WHEN** every variant has exactly one valid value for every current option and all other publish requirements pass
- **THEN** the system allows the product to publish

### Requirement: Storefront product detail exposes selectable option graph
The storefront product detail API SHALL return enough shopper-safe option and variant data for the storefront to evaluate valid combinations, disabled selections, purchase availability, and Contact Price inquiry.

#### Scenario: Detail includes option values and variant selections
- **WHEN** a shopper requests a published product detail
- **THEN** the response includes product options, option values, variants, each variant's selected option values, variant position, variant ID, price amount, inventory quantity, and backorder setting

#### Scenario: Detail preserves default option data
- **WHEN** a shopper requests detail for a product with only `Default option` / `Default option value`
- **THEN** the response includes that option and value as real product data

#### Scenario: Detail marks unavailable combinations through variant data
- **WHEN** published product data contains combinations that do not resolve to a valid variant
- **THEN** the response contains enough data for the storefront to keep the product visible and disable those selections

### Requirement: Storefront option selection disables invalid combinations by current context
The storefront SHALL keep option values visible and disable only values that would not resolve to a valid variant with the currently selected option values.

#### Scenario: Disables value for current combination
- **WHEN** a shopper has selected `Color: Red` and `Size: XL` does not resolve to a valid variant with Red
- **THEN** the storefront shows `Size: XL` as disabled in that current selection context

#### Scenario: Does not globally disable value
- **WHEN** `Size: XL` resolves to a valid variant with `Color: Blue`
- **THEN** the storefront does not globally disable `Size: XL` for all color selections

#### Scenario: Default-only option auto-selects
- **WHEN** a product only has `Default option` / `Default option value`
- **THEN** the storefront may auto-select the value and does not require the shopper to click it before proceeding

### Requirement: Storefront auto-reselects a valid variant
The storefront SHALL move the shopper to the first valid variant when the current selected combination does not resolve to a valid variant.

#### Scenario: Auto-selects first valid variant on load
- **WHEN** a product detail page loads without a valid selected variant
- **THEN** the storefront selects the first valid variant ordered by variant position and then variant ID

#### Scenario: Auto-reselects after invalidating selection
- **WHEN** a shopper action or refreshed product data makes the current option selection invalid
- **THEN** the storefront reselects the first valid variant ordered by variant position and then variant ID

#### Scenario: Disables action when no valid variant exists
- **WHEN** no variant resolves to a complete valid option selection
- **THEN** the storefront disables purchase and inquiry actions for that product detail state

### Requirement: Storefront purchase CTA separates selection validity from purchase availability
The storefront SHALL keep existing variants selectable even when Contact Price, inventory, or backorder state changes the primary call to action.

#### Scenario: Contact Price variant remains selectable
- **WHEN** a selected valid variant has no public price amount
- **THEN** the storefront keeps the variant selected and shows `Contact for price` as the primary CTA

#### Scenario: Contact Price CTA precedes stock state
- **WHEN** a selected valid variant has no public price amount and inventory is zero
- **THEN** the primary CTA is `Contact for price` rather than `Out of stock`

#### Scenario: Out-of-stock priced variant remains selected
- **WHEN** a selected valid variant has a numeric price, zero inventory, and backorders disabled
- **THEN** the storefront keeps the option combination selected and shows a disabled `Out of stock` CTA

#### Scenario: Backorder variant remains purchasable
- **WHEN** a selected valid variant has a numeric price, zero inventory, and backorders enabled
- **THEN** the storefront keeps the primary CTA as `Add to cart` and may show backorder context separately

### Requirement: Contact Price inquiry captures selected variant context
The system SHALL start a Contact Price inquiry only when the shopper has a valid selected variant, and SHALL capture the selected product, variant, option snapshot, any entered customization values, and shopper contact details.

#### Scenario: Starts inquiry for valid Contact Price variant
- **WHEN** a shopper clicks `Contact for price` with a valid selected variant
- **THEN** the inquiry captures product ID, variant ID, option labels and values, any entered customization values, and shopper contact details

#### Scenario: Does not require checkout-ready customization
- **WHEN** a customizable product has partial customization values and the shopper submits a Contact Price inquiry
- **THEN** the inquiry can be submitted without satisfying checkout-ready customization requirements

#### Scenario: Disables inquiry without valid variant
- **WHEN** the current product detail state has no valid selected variant
- **THEN** the storefront does not allow Contact Price inquiry submission

### Requirement: Contact Price remains outside cart and order creation
The system SHALL NOT create cart lines, checkout items, orders, or order drafts for Contact Price variants.

#### Scenario: Contact Price click does not create cart line
- **WHEN** a shopper clicks `Contact for price`
- **THEN** the storefront opens the inquiry flow and does not add a cart line

#### Scenario: Cart still rejects Contact Price variant
- **WHEN** a shopper attempts to add a Contact Price variant through cart APIs or client state
- **THEN** the system rejects or marks that line unavailable for checkout

#### Scenario: Order creation still rejects Contact Price item
- **WHEN** a shopper submits an order item whose selected variant has no numeric price
- **THEN** the system rejects the order request and creates no order
