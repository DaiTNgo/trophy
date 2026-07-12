## MODIFIED Requirements

### Requirement: Customization navigation owns templates, clipart, and brand assets
The admin app SHALL expose Customization as the parent area for Templates, Clipart, and Brand Assets, and SHALL use `/customization/templates`, `/customization/clipart`, and `/customization/brand-assets` as the direct routes without legacy redirects. `/customization/clipart` SHALL serve as the clipart category list page, and category-specific clipart media management SHALL live under `/customization/clipart/:categoryId`.

#### Scenario: Admin opens customization templates
- **WHEN** an admin navigates to Customization > Templates
- **THEN** the admin app shows the product customization template management experience at `/customization/templates`

#### Scenario: Admin opens clipart management
- **WHEN** an admin navigates to Customization > Clipart
- **THEN** the admin app shows clipart category management at `/customization/clipart` and lets the admin open category-specific media management from that list

#### Scenario: Admin opens brand assets
- **WHEN** an admin navigates to Customization > Brand Assets
- **THEN** the admin app shows only customization brand asset management for colors and fonts at `/customization/brand-assets`
