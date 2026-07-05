## ADDED Requirements

### Requirement: Admin can upload media for a collection
The system SHALL allow admin operators to upload an image or media file for a collection on the collection detail page and save its URL to the collection metadata.

#### Scenario: Admin uploads media for a new collection
- **WHEN** the admin operator creates a new collection and uploads an image
- **THEN** the system uploads the file, retrieves a content URL, and saves it to the `imageUrl` field when creating the collection

#### Scenario: Admin updates media for an existing collection
- **WHEN** the admin operator edits an existing collection and uploads a new image
- **THEN** the system uploads the file, retrieves a content URL, and updates the `imageUrl` field for that collection
