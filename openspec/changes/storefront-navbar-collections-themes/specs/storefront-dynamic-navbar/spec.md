## ADDED Requirements

### Requirement: Navbar fetches categories from root loader

The system SHALL fetch categories from `GET /api/storefront/categories` in the root route loader and make them available to the Navbar component.

#### Scenario: Root loader fetches categories

- **WHEN** any page loads
- **THEN** the root loader fetches the categories list from the backend API

#### Scenario: Navbar receives categories via route data

- **WHEN** the Navbar component renders
- **THEN** it receives categories from `useRouteLoaderData` instead of hardcoded arrays

### Requirement: Navbar fetches collections from root loader

The system SHALL fetch collections from `GET /api/storefront/collections` in the root route loader and make them available to the Navbar component.

#### Scenario: Root loader fetches collections

- **WHEN** any page loads
- **THEN** the root loader fetches the collections list from the backend API

#### Scenario: Navbar receives collections via route data

- **WHEN** the Navbar component renders
- **THEN** it receives collections from `useRouteLoaderData`

### Requirement: SHOP BY PRODUCT mega menu renders dynamic categories

The "SẢN PHẨM" mega menu SHALL render a grid of categories using their `image_url` from the API. Each category links to `/products?category=<handle>`.

#### Scenario: Mega menu shows category images

- **WHEN** a shopper opens the SẢN PHẨM mega menu
- **THEN** it shows a grid with each category's image and name

#### Scenario: Category link uses handle

- **WHEN** a shopper clicks a category in the mega menu
- **THEN** they are navigated to `/products?category=<handle>`

#### Scenario: Category without image renders placeholder

- **WHEN** a category has a null `image_url`
- **THEN** the grid cell renders a styled placeholder instead of a broken image

### Requirement: CHỦ ĐỀ mega menu renders dynamic collections

The "CHỦ ĐỀ" mega menu SHALL render a grid of collections using their `image_url`. Each collection links to `/collections/<handle>`.

#### Scenario: Mega menu shows collection images

- **WHEN** a shopper opens the CHỦ ĐỀ mega menu
- **THEN** it shows a grid with each collection's image and title

#### Scenario: Collection link uses handle

- **WHEN** a shopper clicks a collection in the CHỦ ĐỀ mega menu
- **THEN** they are navigated to `/collections/<handle>`

### Requirement: Bottom category row is dynamic

The bottom row of the Navbar SHALL render all categories dynamically from the root loader data instead of a hardcoded subset.

#### Scenario: Bottom row matches API categories

- **WHEN** a shopper views the Navbar bottom row
- **THEN** it shows links for all categories returned by the API

#### Scenario: Category link in bottom row uses handle

- **WHEN** a shopper clicks a category in the bottom row
- **THEN** they are navigated to `/products?category=<handle>`

### Requirement: Fake navigation items are removed

The Navbar SHALL NOT include hardcoded mock-only navigation items (VẬT LIỆU, DOANH NGHIỆP, THỂ THAO, LINH KIỆN, SẢN PHẨM MỚI and any display-name-less entries).

#### Scenario: Mock items do not appear

- **WHEN** a shopper views any part of the Navbar
- **THEN** mock-only items that are not backed by real categories are not rendered

### Requirement: Nagivation icons are replaced with real images

The Navbar SHALL render category and collection items with their `image_url` from the API instead of hardcoded Material Symbols icons.

#### Scenario: Image replaces icon

- **WHEN** a category or collection has an `image_url`
- **THEN** the Navbar renders that image in the grid cell instead of an icon
