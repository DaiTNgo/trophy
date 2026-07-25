## ADDED Requirements

### Requirement: Storefront order lookup provides an item-level preview action
The storefront SHALL render a distinct `Preview` action for every order item returned by a successful order lookup.

#### Scenario: Shows preview action for each item
- **WHEN** a shopper successfully looks up an order containing one or more items
- **THEN** each rendered item card contains its own `Preview` action

#### Scenario: Keeps repeated products independent
- **WHEN** an order contains multiple lines with the same product title but different variants or customization values
- **THEN** activating one item's `Preview` action selects only that line's data

### Requirement: Item preview displays shopper-safe purchase snapshot data
The storefront SHALL open a read-only modal for the selected order item and display the purchase-time thumbnail when available, product title, variant title, SKU when available, quantity, and line subtotal from the lookup snapshot.

#### Scenario: Opens the selected item's preview
- **WHEN** a shopper activates an item's `Preview` action
- **THEN** a modal opens showing that item's thumbnail and snapshot fields, and not another item's fields

#### Scenario: Shows the purchase-time thumbnail
- **WHEN** the selected item has a persisted preview image URL
- **THEN** the modal renders that image before the textual details

#### Scenario: Handles an item without an image snapshot
- **WHEN** the selected item has no persisted preview image URL
- **THEN** the modal keeps the textual details and does not render a broken image

#### Scenario: Renders customized item snapshot
- **WHEN** the selected item contains a customization preview snapshot
- **THEN** the modal renders the saved customization values and template through the read-only customization preview component instead of showing only the base thumbnail

#### Scenario: Omits unavailable SKU
- **WHEN** the selected item has no SKU
- **THEN** the modal does not show an empty SKU value or placeholder row

#### Scenario: Does not expose internal snapshot data
- **WHEN** the preview modal is open
- **THEN** it does not display raw rendered design JSON, production status, admin notes, or other internal order data beyond the sanitized data needed to render the purchased customization

### Requirement: Item preview displays only populated customization values
The storefront SHALL show each non-empty customization label and value for the selected item and SHALL omit customization entries without a value.

#### Scenario: Shows populated customization values
- **WHEN** the selected item contains one or more non-empty customization values
- **THEN** the modal shows each populated field with its label and summary value

#### Scenario: Hides empty customization values
- **WHEN** a customization field has an empty value
- **THEN** that field is absent from the modal

#### Scenario: Hides empty customization section
- **WHEN** the selected item has no populated customization values
- **THEN** the modal does not render an empty customization section

### Requirement: Item preview is dismissible without mutating the order
The storefront SHALL provide a `Đóng` action that closes the preview modal and SHALL not provide edit, reorder, cart, or order mutation actions within it.

#### Scenario: Closes with explicit action
- **WHEN** a shopper activates the `Đóng` action
- **THEN** the modal closes and the order lookup result remains unchanged

#### Scenario: Closes through Dialog dismissal
- **WHEN** a shopper dismisses the Dialog through its standard close affordance or overlay interaction
- **THEN** the modal closes without changing the selected order item or order data
