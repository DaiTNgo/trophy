## ADDED Requirements

### Requirement: Mobile PDP suppresses the category strip
The storefront product detail page SHALL suppress the category strip below the navbar on small-device layouts so the preview and product-detail content receive more vertical space.

#### Scenario: Shopper opens mobile product detail page
- **WHEN** a shopper views a product detail page on a small-device viewport
- **THEN** the mobile navbar shell SHALL render without the category strip below it

### Requirement: Mobile PDP navbar does not stay sticky
The storefront product detail page SHALL render the mobile navbar in normal document flow so the mobile preview shell is the only sticky layer in the customization flow.

#### Scenario: Shopper views a product detail page on mobile
- **WHEN** a shopper views a product detail page on a small-device viewport
- **THEN** the storefront navbar SHALL NOT remain sticky while the shopper scrolls
- **AND** desktop PDP navigation behavior SHALL remain unchanged

### Requirement: Mobile PDP preview shell becomes sticky in the customization flow
The storefront product detail page SHALL render the customization preview inside a mobile-only shell that becomes sticky at the top of the viewport, above the mobile navbar, when the shopper scrolls into the preview and customization region.

#### Scenario: Shopper scrolls into mobile customization region
- **WHEN** a shopper on a small-device viewport scrolls to the product preview and customization section
- **THEN** the preview shell SHALL stick at the top of the viewport above the mobile navbar while the shopper continues through the customization controls

### Requirement: Mobile PDP preview shell uses constrained viewport height
When visible on a small-device viewport, the mobile preview shell SHALL use a constrained height intended to show the product clearly without dominating the full screen.

#### Scenario: Mobile preview shell is visible
- **WHEN** a shopper views the visible preview shell on a small-device viewport
- **THEN** the preview shell SHALL occupy an approximately half-screen presentation rather than consuming the full viewport height

### Requirement: Mobile PDP preview shell supports hide and show states
The storefront product detail page SHALL let shoppers hide the sticky preview shell and restore it through a persistent sticky control.

#### Scenario: Shopper hides the mobile preview shell
- **WHEN** a shopper activates `Hide preview` on the sticky mobile preview shell
- **THEN** the full preview shell SHALL be hidden
- **AND** a slim sticky `Show preview` bar SHALL remain available at the top of the viewport above the mobile navbar
- **AND** the storefront SHALL preserve the shopper's current scroll position instead of jumping the page upward

#### Scenario: Shopper shows the mobile preview shell again
- **WHEN** a shopper activates `Show preview` from the sticky hidden-preview bar
- **THEN** the storefront SHALL restore the mobile preview shell in its normal visible sticky state

#### Scenario: Shopper scrolls upward after hiding the preview
- **WHEN** a shopper has hidden the preview shell and scrolls upward without reaching the top of the page
- **THEN** the storefront SHALL keep the preview in its hidden state
- **AND** the sticky `Show preview` control SHALL remain visible instead of auto-restoring the full preview

#### Scenario: Shopper returns to the top of the page after hiding the preview
- **WHEN** a shopper has hidden the preview shell and scrolls back to page top
- **THEN** the storefront SHALL restore the full preview shell automatically

#### Scenario: Shopper is above the sticky region
- **WHEN** a shopper has not yet scrolled into the sticky preview region
- **THEN** the storefront SHALL NOT show `Hide preview` or `Show preview` controls

### Requirement: Mobile preview shell behavior is limited to customizable PDP mobile layouts
The sticky mobile preview shell SHALL only apply where the storefront product detail page renders a customization preview on small-device layouts.

#### Scenario: Product detail page has no customization preview
- **WHEN** a shopper views a product detail page that does not expose a customization preview
- **THEN** the storefront SHALL NOT render the mobile sticky preview shell behavior

#### Scenario: Shopper views desktop product detail page
- **WHEN** a shopper views the product detail page on a desktop viewport
- **THEN** the storefront SHALL preserve the existing non-mobile preview layout behavior
