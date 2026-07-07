## ADDED Requirements

### Requirement: Admin Icon Asset Library

The system SHALL allow administrators to manage reusable customization icon assets as Brand Assets.

#### Scenario: Upload an icon asset

- **WHEN** an administrator uploads a valid SVG, PNG, or WebP icon asset with a name
- **THEN** the system stores the source asset with name, file type, preview URL, active state, and created timestamp
- **AND** the asset becomes available for admin selection in product customization allowlists

#### Scenario: Categorize icon assets

- **WHEN** an administrator assigns a category or tags to an icon asset
- **THEN** the Brand Assets icon library stores those values
- **AND** the admin icon picker can use them for filtering or search

#### Scenario: Deactivate an icon asset

- **WHEN** an administrator marks an icon asset inactive
- **THEN** the asset is no longer offered for new shopper icon selections
- **AND** existing order customization snapshots that already reference the icon remain reproducible

### Requirement: Product Layer Icon Allowlist

The system SHALL require each icon-library-enabled customization layer to define which admin icon assets shoppers may choose.

#### Scenario: Configure a fixed clipart layer

- **WHEN** an administrator sets an image/icon layer source policy to fixed clipart
- **THEN** the administrator must select exactly one active icon asset for that layer
- **AND** the selected clipart renders in preview and production without showing a shopper input control for that layer

#### Scenario: Configure a clipart category layer

- **WHEN** an administrator sets an image/icon layer source policy to clipart category only
- **THEN** the administrator must select one clipart category for that layer
- **AND** the product customization cannot be published when the selected category has no active allowed icons for that layer

#### Scenario: Configure upload or clipart behavior

- **WHEN** an administrator sets an image/icon layer source policy to upload or clipart category
- **THEN** the administrator must select one clipart category and a storefront presentation mode for that layer
- **AND** the layer accepts either a shopper upload value or an allowed icon asset value from the fixed category
- **AND** the layer still uses the same fixed geometry, shape clipping, and z-index for both sources

#### Scenario: Hide global icons from shoppers

- **WHEN** a shopper opens a customizable product with an icon-library-enabled layer
- **THEN** the shopper sees only icon assets included in that layer's allowlist
- **AND** the shopper does not see the full global icon asset library

### Requirement: Shopper Icon Choice

The system SHALL let shoppers choose an allowed icon asset as a customization value.

#### Scenario: Choose upload source

- **WHEN** a shopper selects `Upload image` for an upload-or-clipart-category layer with source-select presentation
- **THEN** the shopper form shows the media upload control
- **AND** the selected uploaded image uses the existing pan and scale controls inside the fixed shape
- **AND** the shopper cannot change the shape's position, size, rotation, clipping shape, or z-index

#### Scenario: Choose clipart source

- **WHEN** a shopper selects `Clipart` for an upload-or-clipart-category layer with source-select presentation
- **THEN** the shopper form shows the fixed category's active allowed clipart icons
- **AND** selecting an icon updates the preview inside the fixed shape

#### Scenario: Select an allowed icon

- **WHEN** a shopper selects an icon from the layer's allowed icon list
- **THEN** the customization preview renders that icon inside the layer's fixed placement
- **AND** the shopper cannot move, resize, rotate, reshape, or reorder the layer

#### Scenario: Show clipart-category-only layer

- **WHEN** a shopper opens a clipart-category-only layer
- **THEN** the shopper form shows the fixed category's active allowed clipart icons without an upload source option
- **AND** selecting an icon updates the preview inside the fixed shape

#### Scenario: Show upload and clipart side by side

- **WHEN** a shopper opens an upload-or-clipart-category layer with side-by-side presentation
- **THEN** the shopper form shows the fixed category's active allowed clipart icons and the upload image action together
- **AND** choosing either a clipart icon or an uploaded image updates the same fixed shape preview

#### Scenario: Show fixed clipart layer

- **WHEN** a shopper opens a product with a fixed-clipart layer
- **THEN** the preview renders the admin-selected clipart inside the fixed shape
- **AND** the shopper form does not show upload, category, or icon-choice controls for that layer

#### Scenario: Show upload-only layer

- **WHEN** a shopper opens an upload-only layer
- **THEN** the shopper form shows the media upload flow without clipart categories
- **AND** upload pan and scale behavior remains unchanged from the existing shape image behavior

#### Scenario: Reject unavailable icon value

- **WHEN** a shopper submits an icon value that is not in the published layer allowlist
- **THEN** the system rejects the customization value
- **AND** checkout remains blocked until the shopper chooses an allowed icon or valid upload alternative

#### Scenario: Required icon layer without value

- **WHEN** a clipart-category-enabled layer is required and the shopper has not selected an icon or valid upload alternative
- **THEN** the system marks the customization incomplete
- **AND** checkout remains blocked

### Requirement: Storefront Source Policy Runtime

The system SHALL publish explicit source-policy runtime data for every image/icon customization layer so storefront rendering does not infer behavior from asset presence.

#### Scenario: Publish fixed clipart runtime

- **WHEN** storefront loads a published fixed-clipart layer
- **THEN** the runtime layer includes `sourcePolicy` as `fixed_clipart`
- **AND** includes exactly one shopper-safe `fixedIcon`
- **AND** does not include shopper-facing upload controls or clipart category choices for that layer

#### Scenario: Publish upload-only runtime

- **WHEN** storefront loads a published upload-only layer
- **THEN** the runtime layer includes `sourcePolicy` as `upload_only`
- **AND** includes upload configuration for the existing media upload, pan, and scale behavior
- **AND** does not include shopper-facing fixed clipart or clipart category choices for that layer

#### Scenario: Publish clipart-category runtime

- **WHEN** storefront loads a published clipart-category-only layer
- **THEN** the runtime layer includes `sourcePolicy` as `clipart_category_only`
- **AND** includes the fixed category and active allowed icon summaries for that category
- **AND** does not include shopper-facing upload controls for that layer

#### Scenario: Publish upload-or-clipart runtime

- **WHEN** storefront loads a published upload-or-clipart-category layer
- **THEN** the runtime layer includes `sourcePolicy` as `upload_or_clipart_category`
- **AND** includes upload configuration, presentation mode, fixed category, and active allowed icon summaries for that category
- **AND** storefront can render either source-select controls or side-by-side controls from the explicit presentation mode

#### Scenario: Runtime omits admin-only icon metadata

- **WHEN** storefront receives icon runtime data
- **THEN** each icon contains only shopper-safe fields needed for display, selection, snapshot, and render
- **AND** admin-only storage keys, inactive unreferenced assets, and unrelated global library icons are omitted

### Requirement: Icon Rendering And Export

The system SHALL render selected icons consistently across admin preview, storefront preview, cart/order snapshots, and production export.

#### Scenario: Render vector icon

- **WHEN** a selected icon asset is SVG
- **THEN** the preview renders the icon through the layer's fixed geometry and clipping rules
- **AND** production export preserves vector output where the export format supports it

#### Scenario: Render raster icon

- **WHEN** a selected icon asset is PNG or WebP
- **THEN** the preview renders the icon through the layer's fixed geometry and clipping rules
- **AND** production export uses the original raster asset rather than a low-resolution preview derivative

#### Scenario: Same design across surfaces

- **WHEN** the same icon customization value is displayed in admin preview, storefront preview, cart review, order detail, and production export
- **THEN** each surface resolves the same selected icon identity and layer placement
- **AND** the rendered result remains aligned to the selected variant background

### Requirement: Icon Choice Snapshot

The system SHALL capture selected icon values as immutable order customization data.

#### Scenario: Add icon-customized item to cart

- **WHEN** a shopper adds a customizable product with a selected icon to the cart
- **THEN** the cart line stores the selected icon value with asset ID, icon name, file type, preview/source reference, and layer ID
- **AND** cart line merge behavior treats different selected icons as different customized selections

#### Scenario: Create order from icon-customized cart line

- **WHEN** checkout creates an order from a cart line containing a selected icon
- **THEN** the order item customization snapshot includes the selected icon metadata and rendered design context
- **AND** later Brand Assets edits do not change the purchased icon choice on that order item

### Requirement: Icon Asset Route Boundaries

The system SHALL expose icon asset management through admin-only routes and icon runtime data through shopper-safe storefront routes.

#### Scenario: Admin manages icons

- **WHEN** an authenticated admin requests icon asset management operations
- **THEN** the admin route surface supports listing, creating/uploading, updating metadata, and deactivating icon assets
- **AND** unauthenticated or non-admin requests are rejected

#### Scenario: Storefront reads only allowed icons

- **WHEN** the storefront loads a published customizable product
- **THEN** the storefront route surface includes only the icon choices allowed by that product's published customization layers
- **AND** admin-only icon metadata and inactive unreferenced assets are not exposed
