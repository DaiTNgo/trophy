## ADDED Requirements

### Requirement: Admin can upload media for a category
The system SHALL allow admin operators to upload an image or media file for a category on the category detail page and save its URL to the category metadata.

#### Scenario: Admin uploads media for a new category
- **WHEN** the admin operator creates a new category and uploads an image
- **THEN** the system uploads the file, retrieves a content URL, and saves it to the `imageUrl` field when creating the category

#### Scenario: Admin updates media for an existing category
- **WHEN** the admin operator edits an existing category and uploads a new image
- **THEN** the system uploads the file, retrieves a content URL, and updates the `imageUrl` field for that category
