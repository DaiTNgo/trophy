## ADDED Requirements

### Requirement: Mobile PDP suppresses the category strip
The storefront product detail page SHALL suppress the category strip below the navbar on small-device layouts so the preview and product-detail content receive more vertical space.

#### Scenario: Shopper opens mobile product detail page
- **WHEN** a shopper views a product detail page on a small-device viewport
- **THEN** the mobile navbar shell SHALL render without the category strip below it

### Requirement: Mobile PDP preview shell becomes sticky in the customization flow
The storefront product detail page SHALL render the customization preview inside a mobile-only shell that becomes sticky beneath the mobile navbar when the shopper scrolls into the preview and customization region.

#### Scenario: Shopper scrolls into mobile customization region
- **WHEN** a shopper on a small-device viewport scrolls to the product preview and customization section
- **THEN** the preview shell SHALL stick below the mobile navbar while the shopper continues through the customization controls

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
- **AND** a slim sticky `Show preview` bar SHALL remain available below the mobile navbar

#### Scenario: Shopper shows the mobile preview shell again
- **WHEN** a shopper activates `Show preview` from the sticky hidden-preview bar
- **THEN** the storefront SHALL restore the mobile preview shell in its normal visible sticky state

### Requirement: Mobile preview shell behavior is limited to customizable PDP mobile layouts
The sticky mobile preview shell SHALL only apply where the storefront product detail page renders a customization preview on small-device layouts.

#### Scenario: Product detail page has no customization preview
- **WHEN** a shopper views a product detail page that does not expose a customization preview
- **THEN** the storefront SHALL NOT render the mobile sticky preview shell behavior

#### Scenario: Shopper views desktop product detail page
- **WHEN** a shopper views the product detail page on a desktop viewport
- **THEN** the storefront SHALL preserve the existing non-mobile preview layout behavior
