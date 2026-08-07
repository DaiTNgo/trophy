## ADDED Requirements

### Requirement: Product detail links use a category-independent canonical URL
The storefront SHALL use `/product/:productHandle` as the canonical URL for product detail links from product cards, search results, collections, category listings, cart-related product links, and product detail navigation.

#### Scenario: Product card links to canonical product route
- **WHEN** a shopper selects a product card from a category or collection listing
- **THEN** the link targets `/product/:productHandle` without embedding a category handle

#### Scenario: Product remains linkable after category is hidden
- **WHEN** a product was displayed from a category and that category later becomes hidden
- **THEN** the product's canonical URL remains `/product/:productHandle` and does not depend on the hidden category

### Requirement: Legacy category-scoped product URLs redirect
The storefront SHALL redirect `/categories/:categoryHandle/products/:productHandle` to `/product/:productHandle` when the product detail exists under the existing product publication rules.

#### Scenario: Legacy URL redirects to canonical URL
- **WHEN** a shopper requests a valid legacy category-scoped product URL
- **THEN** the response redirects to `/product/:productHandle`

#### Scenario: Legacy URL does not preserve hidden category context
- **WHEN** a shopper requests a legacy product URL whose category is hidden
- **THEN** the response redirects to `/product/:productHandle` if the product is otherwise publicly available, without rendering the hidden category page

### Requirement: Product detail shows only public category links
The product detail page SHALL omit hidden categories from breadcrumb and category links while continuing to render the product when the product itself is publicly available.

#### Scenario: Hidden category is omitted from breadcrumbs
- **WHEN** a public product belongs to both public and hidden categories
- **THEN** product detail renders links only for the public categories

#### Scenario: Product with no public category remains viewable
- **WHEN** a publicly available product belongs only to hidden categories
- **THEN** `/product/:productHandle` renders the product without a hidden category link
