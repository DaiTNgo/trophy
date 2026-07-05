## ADDED Requirements

### Requirement: Export vector PDF with embedded background page

`POST /api/customizations/exports/pdf` SHALL produce a vector PDF that embeds the original background PDF page as the base layer.

#### Scenario: Export with PDF background
- **WHEN** a POST request to `/api/customizations/exports/pdf` includes a template with `background.pdfAssetId`
- **THEN** the backend loads the original PDF from R2 using `pdfAssetId`
- **THEN** the backend embeds page 0 as a Form XObject via pdf-lib `embedPages()`
- **THEN** the output PDF contains exactly one page with the background PDF page as the base layer
- **THEN** the output PDF preserves vector content (paths, text, embedded images) from the original PDF

#### Scenario: Export with image background (fallback)
- **WHEN** a POST request to `/api/customizations/exports/pdf` includes a template with `background.pdfAssetId` missing and an image background
- **THEN** the backend embeds the background PNG/JPEG as a raster image at full page size
- **THEN** the output PDF is valid and contains one page

#### Scenario: Export with no background
- **WHEN** a POST request to `/api/customizations/exports/pdf` includes a template with no background
- **THEN** the backend returns 422

---

### Requirement: Embed real fonts in PDF export

The PDF export SHALL embed TTF font files for each text layer in the design, using the font specified by the design's `fontId`.

#### Scenario: Text layer with embedded font
- **WHEN** a PDF export includes a text layer with `fontId: "sans_bold"`
- **THEN** the backend loads the `SansBold.ttf` font file
- **THEN** the font is embedded in the output PDF via `pdfDoc.embedFont()`
- **THEN** the text is rendered using the embedded font
- **THEN** the text is selectable in a PDF viewer

#### Scenario: Text layer with missing font
- **WHEN** a PDF export includes a text layer with a `fontId` whose TTF file is not found
- **THEN** the backend falls back to `StandardFonts.Helvetica`
- **THEN** the export continues without error

#### Scenario: Text layer with shopper-selected color
- **WHEN** a PDF export includes a text layer whose design specifies a `color`
- **THEN** the text is rendered in the specified color using `page.drawText(text, { color: rgb(...) })`

---

### Requirement: Render straight text at geometry position

The PDF export SHALL render straight text layers at their geometry position relative to the background page.

#### Scenario: Straight text rendered at position
- **WHEN** a PDF export includes a text layer with `path.type: "straight"`
- **THEN** the text is drawn at the layer's `xRatio`/`yRatio` position
- **THEN** the text uses the font size from the design's `fontSizePt`
- **THEN** the text alignment (left/center/right) is respected

---

### Requirement: Render path text character by character

The PDF export SHALL render text on closed_ellipse and other path types by positioning each character individually along the path.

#### Scenario: Closed ellipse path text
- **WHEN** a PDF export includes a text layer with `path.type: "closed_ellipse"`
- **THEN** the total text width is measured at the given font size
- **THEN** the start position is computed based on alignment (left/center/right anchored at `startAngle`)
- **THEN** each character is placed individually along the path
- **THEN** each character is rotated to match the path tangent at its position
- **THEN** placement modes (over/below/in path) shift the character Y offset accordingly

#### Scenario: Arc path text
- **WHEN** a PDF export includes a text layer with `path.type: "arc_up"` or `"arc_down"`
- **THEN** text characters follow the arc curve
- **THEN** each character is rotated to the curve tangent

---

### Requirement: Embed and clip image shape layers

The PDF export SHALL embed uploaded shopper images and clip them to the layer's shape path.

#### Scenario: Image shape layer in PDF
- **WHEN** a PDF export includes an image shape layer
- **THEN** the backend loads the uploaded image from the design's `previewUrl`
- **THEN** the image is embedded as PNG or JPEG via `pdfDoc.embedPng()` / `pdfDoc.embedJpg()`
- **THEN** the image is drawn at the layer's geometry position
- **THEN** a clip path is applied matching the layer's shape type (rectangle, circle, ellipse, etc.)

#### Scenario: Image shape layer with crop
- **WHEN** a PDF export includes an image shape layer with `cropScale`, `cropXRatio`, `cropYRatio`
- **THEN** the image is positioned within the shape bounds using cover-fit math
- **THEN** overflow is clipped to the shape

---

### Requirement: Return PDF with correct headers

The PDF export endpoint SHALL return the PDF binary with appropriate HTTP headers.

#### Scenario: Successful PDF export
- **WHEN** the PDF is generated successfully
- **THEN** the response status is 200
- **THEN** `Content-Type` is `application/pdf`
- **THEN** `Content-Disposition` is `attachment; filename="{designId}.pdf"`
- **THEN** the response body is the PDF binary

#### Scenario: Validation failure
- **WHEN** the input template or design fails validation
- **THEN** the response status is 422
- **THEN** the response body contains validation error details
