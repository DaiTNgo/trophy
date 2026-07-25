## ADDED Requirements

### Requirement: Selected variant media carousel
The storefront SHALL expose one ordered media sequence for the selected variant, placing its Customization Media first when present and then its Gallery Media in ascending persisted position order.

#### Scenario: Variant has customization and gallery media
- **WHEN** a shopper opens a product with a selected variant that has Customization Media and one or more Gallery Media items
- **THEN** the main media sequence starts with the Customization Media and continues through the ordered Gallery Media without changing the selected variant

#### Scenario: Variant has gallery media only
- **WHEN** a shopper views a variant without Customization Media but with Gallery Media
- **THEN** the sequence starts with the first Gallery Media and remains navigable

#### Scenario: Variant has no media
- **WHEN** a shopper views a selected variant with neither Customization Media nor Gallery Media
- **THEN** the storefront shows its existing unavailable-media state and does not render active navigation controls

### Requirement: Previous and Next media controls
The storefront SHALL render accessible Previous and Next controls for a media sequence with more than one item, and each control SHALL move the active media by one item with wraparound at either end.

#### Scenario: Shopper advances through media
- **WHEN** a shopper activates Next on any media except the final item
- **THEN** the next item becomes the main media and its thumbnail is marked active

#### Scenario: Shopper advances past the final item
- **WHEN** a shopper activates Next while the final item is active
- **THEN** the first item, Customization Media when present, becomes the main media

#### Scenario: Shopper moves backward past the first item
- **WHEN** a shopper activates Previous while the first item is active
- **THEN** the final item becomes the main media

#### Scenario: Single-item sequence
- **WHEN** a media sequence contains zero or one item
- **THEN** Previous and Next controls are not rendered

### Requirement: Direct thumbnail selection
The storefront SHALL retain direct thumbnail selection for every item in the normalized media sequence, and selecting a thumbnail SHALL update the same active media used by Previous and Next.

#### Scenario: Shopper selects customization thumbnail
- **WHEN** a shopper selects the Customization Media thumbnail
- **THEN** the Customization Media becomes the main media without changing customization form values

#### Scenario: Shopper selects gallery thumbnail
- **WHEN** a shopper selects a Gallery Media thumbnail
- **THEN** that Gallery Media becomes the main media without changing the selected variant

### Requirement: Variant change resets active media
The storefront SHALL reset the active media to the newly selected variant's Customization Media when available, otherwise to its first Gallery Media.

#### Scenario: New variant has customization media
- **WHEN** a shopper changes from one variant to another variant with Customization Media
- **THEN** the new variant's Customization Media is displayed as the main media and its sequence starts at index zero

#### Scenario: New variant lacks customization media
- **WHEN** a shopper changes to a variant without Customization Media but with Gallery Media
- **THEN** the new variant's first Gallery Media is displayed as the main media

### Requirement: Customization form interaction resets preview
The shared customization form SHALL provide an optional interaction callback, and the storefront SHALL invoke a Customization Preview Reset when the shopper focuses or pointer-interacts with the customization form.

#### Scenario: Shopper returns to editing after viewing gallery media
- **WHEN** the shopper focuses or clicks any customization form control or the form surface while a Gallery Media item is active
- **THEN** the selected variant's Customization Media becomes the main media when available
- **AND** all current customization form values remain unchanged

#### Scenario: Customization media is unavailable during form interaction
- **WHEN** the shopper focuses or clicks the customization form for a variant without Customization Media
- **THEN** the storefront selects the first available media in that variant's sequence and preserves all current form values

#### Scenario: Form interaction is repeated
- **WHEN** the shopper interacts with the customization form while Customization Media is already active
- **THEN** the active media remains unchanged and the form values remain unchanged

### Requirement: Responsive and accessible controls
The storefront SHALL provide the same active media and navigation behavior in its desktop and mobile product layouts, and Previous/Next controls SHALL expose descriptive accessible labels.

#### Scenario: Shopper uses mobile product view
- **WHEN** the shopper navigates media in the mobile sticky preview
- **THEN** the active media and thumbnail selection follow the same sequence and index as the product gallery model

#### Scenario: Assistive technology identifies controls
- **WHEN** a screen reader encounters a rendered navigation control
- **THEN** Previous and Next expose labels that identify the direction and product-media navigation purpose
