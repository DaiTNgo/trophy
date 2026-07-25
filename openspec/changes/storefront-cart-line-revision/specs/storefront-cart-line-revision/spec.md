## ADDED Requirements

### Requirement: Cart exposes revision entry for customizable lines
The storefront cart SHALL expose a review-and-edit action for every Cart Line whose product is customizable, including a line that is not checkout-ready. The action SHALL not be shown for a non-customizable Cart Line, which retains its ordinary product-detail navigation.

#### Scenario: Shopper opens a valid customized cart line
- **WHEN** a shopper views a cart line for a customizable product with valid customization
- **THEN** the line provides a review-and-edit action that opens that product's PDP with a reference to the cart line

#### Scenario: Shopper opens a cart line invalidated by catalog changes
- **WHEN** a shopper views a customizable cart line that current cart resolution marks invalid
- **THEN** the line still provides the review-and-edit action

#### Scenario: Shopper views a non-customizable cart line
- **WHEN** a shopper views a cart line for a non-customizable product
- **THEN** the cart does not provide the review-and-edit action

### Requirement: PDP restores a referenced cart line into a normal product session
The storefront PDP SHALL resolve a referenced Cart Line from the browser cart after browser-cart hydration and restore its selected variant and customization values into the normal PDP controls. The restoration reference SHALL survive the generic product-path redirect, browser refresh, and opening the PDP in a new tab without including customization values in the URL.

#### Scenario: Shopper reopens a cart line from the cart
- **WHEN** a shopper invokes review-and-edit for a customizable cart line
- **THEN** the PDP opens at its ordinary page position with the line's variant and compatible customization values loaded
- **AND THEN** the shopper can use all normal variant, quantity, customization, preview, and add-to-cart controls

#### Scenario: Shopper refreshes a restored PDP
- **WHEN** a shopper refreshes or opens a new tab for a PDP URL that references an existing cart line
- **THEN** the PDP restores that cart line after the browser cart is available

#### Scenario: Source cart line is no longer available
- **WHEN** a PDP restoration reference does not resolve to a browser-cart line
- **THEN** the PDP uses normal product defaults
- **AND THEN** it informs the shopper that the saved customization could not be restored

### Requirement: Restored cart data is validated against current product state
The storefront SHALL validate a Cart Line Revision against the current published product, selected purchasable variant, and customization template before it can be added. It SHALL retain compatible values, identify incompatible restored selections, and leave the source Cart Line unchanged.

#### Scenario: Variant or required customization value no longer matches current data
- **WHEN** a restored cart line contains a variant or required customization value that is not valid for the current PDP
- **THEN** the PDP identifies the restoration issue
- **AND THEN** it prevents adding the revision until the shopper makes a valid current selection

#### Scenario: Restored values remain compatible
- **WHEN** the restored variant and customization values are valid for the current PDP
- **THEN** the live preview and form render those restored values without requiring re-entry

### Requirement: Adding a revision creates an independent cart line
The storefront SHALL initialize a Cart Line Revision quantity to one. When the shopper adds a restored PDP session to the cart, it SHALL create an independent Cart Line even when its product ID, variant ID, and customization values equal an existing cart line; it SHALL leave the source Cart Line unchanged and keep the shopper on the PDP.

#### Scenario: Shopper adds a changed revision
- **WHEN** a shopper changes restored customization values and adds the PDP selection to the cart
- **THEN** the cart contains the source Cart Line and a separate new Cart Line
- **AND THEN** the shopper remains on the PDP

#### Scenario: Shopper adds an unchanged revision
- **WHEN** a shopper adds a restored PDP selection without changing its product, variant, or customization values
- **THEN** the cart still contains a separate new Cart Line rather than increasing the source line quantity

#### Scenario: Shopper adds a standard PDP selection
- **WHEN** a shopper adds a PDP selection that was not restored from a Cart Line Revision
- **THEN** the storefront retains the existing cart-line merge behavior for matching selections
