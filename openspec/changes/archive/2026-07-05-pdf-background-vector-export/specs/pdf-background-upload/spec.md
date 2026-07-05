## ADDED Requirements

### Requirement: Upload PDF file as background

The admin editor SHALL accept `.pdf` files as template backgrounds via the Background tab or editor drop zone.

#### Scenario: Admin uploads a PDF file
- **WHEN** the admin selects a `.pdf` file in the BackgroundUpload component
- **THEN** the system reads the file as an ArrayBuffer and renders page 0 to a canvas via `pdfjs-dist`

#### Scenario: Admin uploads a non-PDF non-image file
- **WHEN** the admin selects a file with MIME type other than `application/pdf`, `image/png`, or `image/jpeg`
- **THEN** the system rejects the file and shows an error message

---

### Requirement: Generate PNG thumbnail from PDF client-side

The admin editor SHALL generate a PNG data URL from the first page of the uploaded PDF for canvas preview.

#### Scenario: PDF thumbnail renders on canvas
- **WHEN** a PDF file is uploaded as background
- **THEN** a PNG data URL is generated from page 0 via `pdfjs-dist` → canvas → `toDataURL("image/png")`
- **THEN** the canvas displays the thumbnail immediately
- **THEN** no server request is made

#### Scenario: PDF thumbnail dimensions match page size
- **WHEN** a PDF file is uploaded
- **THEN** the canvas dimensions match the first page media box (in points at 72 DPI)
- **THEN** `BackgroundAsset.widthPx` and `heightPx` are set to the canvas pixel dimensions

#### Scenario: PDF thumbnail generation fails
- **WHEN** `pdfjs-dist` fails to render the PDF page
- **THEN** the system shows an error toast
- **THEN** the admin can retry the upload

---

### Requirement: Hold PDF file locally during draft editing

The admin editor SHALL keep the original PDF bytes in local state during draft editing. The PDF SHALL NOT be uploaded to the server until the template is published.

#### Scenario: PDF not uploaded on draft save
- **WHEN** the admin saves a draft template with a PDF background
- **THEN** the PDF bytes are NOT sent to the server
- **THEN** `BackgroundAsset.pendingPdfUpload` is `true`
- **THEN** `BackgroundAsset.previewUrl` is a local data URL

#### Scenario: Reloading a draft with pending PDF upload
- **WHEN** the admin saves a draft with a PDF background and reloads the editor
- **THEN** the canvas thumbnail is visible from the stored data URL
- **THEN** `BackgroundAsset.pendingPdfUpload` is `true`
- **THEN** the admin must re-upload the PDF file to publish

#### Scenario: Replace PDF before publish
- **WHEN** the admin uploads a PDF, then selects a different file (PDF or image) before publishing
- **THEN** the previous file bytes are discarded from local state
- **THEN** `BackgroundAsset` is updated to reflect the new file
- **THEN** `pendingPdfUpload` is set to `true` if the new file is a PDF

---

### Requirement: Upload PDF to R2 at publish time

When the admin publishes a template with a PDF background, the system SHALL upload the original PDF file and PNG thumbnail to R2 via the asset upload endpoint.

#### Scenario: PDF uploaded on publish
- **WHEN** the admin clicks Publish on a template with `pendingPdfUpload: true`
- **THEN** the system sends the PDF bytes and PNG thumbnail to `POST /api/customizations/assets`
- **THEN** the backend stores the original PDF as `original.pdf` and the PNG thumbnail as `preview.png` in R2
- **THEN** the backend inserts a record in `customizationAssets` with `mimeType: "application/pdf"`, `pageCount`, `widthPt`, `heightPt`
- **THEN** the backend returns the permanent asset ID and R2 preview URL
- **THEN** `BackgroundAsset.previewUrl` is updated to the R2 GET URL
- **THEN** `BackgroundAsset.pdfAssetId` is set to the server asset ID
- **THEN** `BackgroundAsset.pendingPdfUpload` is set to `false`

#### Scenario: Publish with oversized PDF
- **WHEN** the admin publishes a template with a PDF larger than 20 MB
- **THEN** the backend returns 413
- **THEN** the admin sees an error and the publish is blocked

#### Scenario: Publish with invalid PDF
- **WHEN** the admin publishes a template with a corrupted or invalid PDF file
- **THEN** the backend returns 415
- **THEN** the admin sees an error and the publish is blocked

---

### Requirement: Extend asset upload endpoint for PDF

`POST /api/customizations/assets` SHALL accept `application/pdf` MIME type in addition to existing `image/png` and `image/jpeg`.

#### Scenario: PDF upload accepted
- **WHEN** a POST request to `/api/customizations/assets` has `Content-Type: application/pdf`
- **THEN** the backend reads PDF metadata via `pdf-lib`: page count, first page media box `width`/`height` in points
- **THEN** the backend stores the file in R2
- **THEN** the backend inserts metadata including `page_count`, `width_pt`, `height_pt` in the `customizationAssets` table

#### Scenario: PDF upload includes PNG thumbnail
- **WHEN** a POST request to `/api/customizations/assets` includes both PDF bytes and a PNG thumbnail
- **THEN** the backend stores the PDF as `original.pdf` and the PNG as `preview.png` in R2 under the same asset key prefix

#### Scenario: Upload with disallowed MIME type
- **WHEN** a POST request to `/api/customizations/assets` has a MIME type other than `image/png`, `image/jpeg`, or `application/pdf`
- **THEN** the backend returns 415

---

### Requirement: Extend BackgroundAsset type

The shared `BackgroundAsset` type SHALL support optional PDF metadata fields.

#### Scenario: BackgroundAsset for PDF background
- **WHEN** a `BackgroundAsset` is created from a PDF file
- **THEN** `mimeType` is `"application/pdf"`
- **THEN** `pdfPageCount` contains the number of PDF pages
- **THEN** `pdfAssetId` contains the R2 asset ID after publish (or null during draft)
- **THEN** `pendingPdfUpload` is `true` during draft, `false` after publish

#### Scenario: BackgroundAsset for image background
- **WHEN** a `BackgroundAsset` is created from a PNG or JPEG file
- **THEN** `mimeType` is `"image/png"` or `"image/jpeg"`
- **THEN** `pdfPageCount`, `pdfAssetId`, and `pendingPdfUpload` are undefined
