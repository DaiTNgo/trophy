## ADDED Requirements

### Requirement: Customization navigation owns templates, clipart, and brand assets
The admin app SHALL expose Customization as the parent area for Templates, Clipart, and Brand Assets, and SHALL use `/customization/templates`, `/customization/clipart`, and `/customization/brand-assets` as the direct routes without legacy redirects.

#### Scenario: Admin opens customization templates
- **WHEN** an admin navigates to Customization > Templates
- **THEN** the admin app shows the product customization template management experience at `/customization/templates`

#### Scenario: Admin opens clipart management
- **WHEN** an admin navigates to Customization > Clipart
- **THEN** the admin app shows clipart category and media management at `/customization/clipart`

#### Scenario: Admin opens brand assets
- **WHEN** an admin navigates to Customization > Brand Assets
- **THEN** the admin app shows only customization brand asset management for colors and fonts at `/customization/brand-assets`

### Requirement: Clipart categories are named media groups
The system SHALL let admins create and manage clipart categories with an admin-authored `name` and system-managed identity, active state, sort order, and timestamps. Clipart categories MUST NOT require slug or description fields.

#### Scenario: Admin creates a clipart category
- **WHEN** an admin submits a new clipart category with a valid name
- **THEN** the system creates an active category with that name and no slug or description requirement

#### Scenario: Admin deactivates a clipart category
- **WHEN** an admin deactivates a clipart category
- **THEN** the category remains available for existing references and historical snapshots but is unavailable for new shopper clipart choices

### Requirement: Clipart assets are media under one category
The system SHALL let admins manage clipart assets as SVG, PNG, or WebP media records that belong to exactly one clipart category. Each clipart asset SHALL have an editable display `name` and a readonly original `fileName`.

#### Scenario: Admin uploads supported clipart media
- **WHEN** an admin uploads an SVG, PNG, or WebP file into a clipart category
- **THEN** the system creates a clipart asset under that category with the original filename retained as readonly admin metadata

#### Scenario: Admin edits clipart display name
- **WHEN** an admin changes a clipart asset display name
- **THEN** shopper-facing labels, hover tooltips, accessible labels, and future order snapshots use the updated display name

#### Scenario: Admin cannot assign tags
- **WHEN** an admin edits a clipart asset
- **THEN** the system provides no tag field and stores no tag metadata for that asset

### Requirement: Batch clipart upload is reviewed and atomic
The admin app SHALL support batch upload into a selected clipart category with a review step that shows each thumbnail, readonly filename, and editable display name. The batch commit MUST be all-or-nothing.

#### Scenario: Admin reviews uploaded files before commit
- **WHEN** an admin selects multiple media files for a clipart category
- **THEN** the review step shows a thumbnail, original filename, and editable name input for each selected file

#### Scenario: Batch contains invalid file
- **WHEN** a batch includes an unsupported file type, missing display name, invalid category, or duplicate file in the same batch
- **THEN** the system rejects the entire batch and identifies the invalid rows for admin correction

### Requirement: Product clipart layers use category allowlists
For every product customization layer using `clipart_category_only` or `upload_or_clipart_category`, the admin app SHALL require one fixed clipart category, a layer clipart allowlist from that category, and a default clipart asset from the allowlist.

#### Scenario: Admin configures a clipart category layer
- **WHEN** an admin selects a clipart category for a layer
- **THEN** the admin app lets the admin choose allowed media only from that clipart category

#### Scenario: Admin selects default media
- **WHEN** an admin configures allowed media for a clipart layer
- **THEN** the admin app requires the default clipart asset to be active, in the selected category, and present in the layer allowlist

#### Scenario: Publish readiness validates clipart references
- **WHEN** a template references a missing or inactive clipart category, allowlisted asset, or default asset
- **THEN** publish readiness fails with actionable validation errors

### Requirement: Source policies exclude fixed clipart
The shared customization model SHALL support `upload_only`, `clipart_category_only`, and `upload_or_clipart_category` source policies, and MUST NOT support `fixed_clipart`.

#### Scenario: Fixed clipart policy is rejected
- **WHEN** validation receives a layer source policy of `fixed_clipart`
- **THEN** validation rejects the layer configuration

#### Scenario: Upload or clipart defaults to clipart
- **WHEN** a shopper opens a layer configured as `upload_or_clipart_category`
- **THEN** the initial selected source is clipart and the default clipart asset is selected

#### Scenario: Upload or clipart preserves supported presentations
- **WHEN** an admin configures `upload_or_clipart_category`
- **THEN** the admin can choose `source_select` or `side_by_side` presentation without configuring a separate default source

### Requirement: Shoppers choose media from the admin-selected allowlist
The storefront SHALL show shoppers only active clipart assets from the layer allowlist for the admin-selected clipart category. Shoppers MUST NOT choose a clipart category.

#### Scenario: Shopper chooses a clipart asset
- **WHEN** a shopper opens a clipart-enabled layer
- **THEN** the storefront shows the allowed active media options with names suitable for hover tooltips and accessible labels

#### Scenario: Shopper cannot choose outside the allowlist
- **WHEN** a shopper submits a clipart asset that is not active, not in the selected category, or not in the layer allowlist
- **THEN** the system rejects the customization value

#### Scenario: Shopper switches upload or clipart source
- **WHEN** a shopper changes between upload and clipart on an `upload_or_clipart_category` layer
- **THEN** only the currently selected source and value are submitted to cart/order processing

### Requirement: Clipart snapshots omit filename and category name
Cart and order snapshots SHALL store clipart asset identity, clipart asset display name, category ID, source asset identity, media URL or source reference, MIME type, dimensions, and rendered layer context. Snapshots MUST NOT store original filename or category display name.

#### Scenario: Order captures selected clipart
- **WHEN** a shopper checks out with a clipart selection
- **THEN** the order snapshot records the selected clipart identity, display name, media reference, and rendered design context without filename or category name

#### Scenario: Historical order remains reproducible
- **WHEN** a referenced clipart category or asset is later deactivated
- **THEN** the historical order snapshot still contains enough media and rendered context to reproduce the purchased design

### Requirement: Clipart API uses current Hono RPC contracts
Backend admin and storefront-consumed clipart routes SHALL expose explicit typed JSON responses through the backend route/app type used by Hono RPC clients.

#### Scenario: Admin client consumes clipart routes
- **WHEN** the admin app creates, lists, updates, deactivates, or batch uploads clipart categories/assets
- **THEN** it uses typed backend route contracts rather than hand-written untyped fetch wrappers

#### Scenario: Backend route rejects invalid input
- **WHEN** a clipart route receives invalid input, missing auth, missing role, or references to missing entities
- **THEN** the route returns an explicit typed JSON error response with the correct status
