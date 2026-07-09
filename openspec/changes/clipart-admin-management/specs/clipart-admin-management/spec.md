## ADDED Requirements

### Requirement: Admin clipart uses list and detail routes
The admin app SHALL provide clipart management as a list/detail flow. `/customization/clipart` SHALL present clipart categories as the primary management list, and `/customization/clipart/:categoryId` SHALL present management for one specific clipart category.

#### Scenario: Admin opens clipart list
- **WHEN** an admin navigates to `Customization > Clipart`
- **THEN** the admin app shows a clipart category list at `/customization/clipart` instead of a combined category-and-media management screen

#### Scenario: Admin opens a clipart category
- **WHEN** an admin selects a clipart category from the list
- **THEN** the admin app navigates to `/customization/clipart/:categoryId` and shows management for that category only

### Requirement: Clipart list page follows admin list-management patterns
The clipart list page SHALL follow the admin app's list-management pattern by showing a page-level create action and lightweight per-category row information suitable for scanning category records before opening one.

#### Scenario: Admin creates a category from the list header
- **WHEN** an admin uses the list page header action to create a clipart category
- **THEN** the action opens a `FocusModal` for category creation rather than an inline form on the list page

#### Scenario: Category row shows summary data
- **WHEN** an admin views the clipart category list
- **THEN** each category row shows at least the category name, active/inactive state, and a clipart asset count suitable for list scanning

### Requirement: Category detail loads category assets lazily
The admin app SHALL load uploaded clipart assets only for the category detail page that an admin has opened. The list page MUST NOT eagerly fetch assets for all clipart categories.

#### Scenario: List page loads without fetching every category asset list
- **WHEN** an admin opens `/customization/clipart`
- **THEN** the admin app loads category list data without loading every category's asset collection

#### Scenario: Detail page fetches one category asset list
- **WHEN** an admin opens `/customization/clipart/:categoryId`
- **THEN** the admin app fetches and shows uploaded media for that category only

### Requirement: Category detail separates upload queue from uploaded media
The clipart category detail page SHALL separate category metadata, the current batch upload queue, and the already uploaded media list so an admin can distinguish staged files from persisted assets.

#### Scenario: Admin reviews queued files separately from uploaded media
- **WHEN** an admin is on a clipart category detail page
- **THEN** the admin app shows the current upload queue as a distinct section from the uploaded media list

#### Scenario: Uploaded media remains category-specific
- **WHEN** an admin views uploaded clipart media on a category detail page
- **THEN** the app shows only media already persisted in that category

### Requirement: Additional file selection appends to the current batch draft queue
For batch uploads on a clipart category detail page, selecting more files SHALL append new draft rows to the existing draft queue rather than replacing already queued rows. Existing uploaded media SHALL remain unchanged until an explicit asset action occurs.

#### Scenario: Admin adds more files before submitting the batch
- **WHEN** an admin has queued clipart upload drafts and selects additional files for the same category before upload
- **THEN** the admin app appends the new draft rows to the existing queue and preserves the previously queued draft rows

#### Scenario: Successful upload clears only the current queue
- **WHEN** an admin submits a valid clipart batch from the category detail page
- **THEN** the app clears the submitted draft queue and refreshes the uploaded media list for that category without deleting existing persisted media
