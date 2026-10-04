## ADDED Requirements

### Requirement: PDF media gets a preview image
The admin SHALL convert an uploaded PDF Product media file into a raster preview image through the shared media-asset helper, and SHALL pass non-PDF files through unchanged.

#### Scenario: PDF upload
- **WHEN** an operator uploads a PDF as Variant Media or Customization Background
- **THEN** a preview image file is produced and the original PDF is kept as the asset

#### Scenario: Image upload
- **WHEN** an operator uploads a PNG, JPEG, or WebP
- **THEN** no preview file is produced and the file is used as-is

### Requirement: Dimensions are read from the original file
The admin SHALL read media dimensions from the original uploaded file, not from its preview image.

#### Scenario: PDF dimensions
- **WHEN** a PDF is uploaded as a Customization Background
- **THEN** the staged dimensions are the PDF's native page dimensions

### Requirement: Unreadable dimensions reject the upload
The admin SHALL reject a Customization Background or Customization Media whose dimensions cannot be read, in every product status, and SHALL NOT stage or send `0`, `{0, 0}`, or undefined dimensions to the backend.

#### Scenario: Corrupt file
- **WHEN** an operator uploads a file whose dimensions cannot be decoded
- **THEN** the upload is rejected with an operator-visible error and nothing is staged

### Requirement: Dimension comparison is shared
The admin SHALL compare uploaded dimensions to the expected canvas or sibling size through one shared comparison that returns false when either side is missing.

#### Scenario: Wrong size
- **WHEN** an uploaded background differs in width or height from the expected size
- **THEN** the comparison reports a mismatch and the Background Size Contract error is shown

#### Scenario: Matching size
- **WHEN** width and height both equal the expected size
- **THEN** the comparison reports a match
