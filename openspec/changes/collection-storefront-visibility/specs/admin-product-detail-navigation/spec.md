## ADDED Requirements

### Requirement: Admin product names link to product detail
The admin product list SHALL render each product name as a link to `/products/:id`, using the existing admin product detail route.

#### Scenario: Product name opens product detail
- **WHEN** an operator clicks a product name in the admin product list
- **THEN** the admin navigates to `/products/:id` for that product

#### Scenario: Product row actions remain independent
- **WHEN** an operator opens the row action menu in the admin product list
- **THEN** the menu remains available for its existing actions without requiring the operator to click the product name link

### Requirement: Admin product rows are not globally clickable
The admin product list SHALL keep the product name as the navigation target and SHALL NOT make the entire row a product-detail link.

#### Scenario: Non-link row area does not replace actions
- **WHEN** an operator interacts with a non-link area of a product row
- **THEN** the product list preserves the existing row layout and independent action-menu behavior
