# PDF Background Upload And Vector PDF Export

## Scope

Add PDF file upload support for the customization template background and produce a true vector PDF export from admin order review. The background PDF is used as a vector base layer — the final export overlays the shopper's text and image choices as real text with embedded fonts, producing a production-ready vector PDF file.

## Goals

- Accept `.pdf` files as template background in the admin editor.
- Store the original PDF in R2 and generate a PNG thumbnail for canvas preview.
- Export a one-page vector PDF at order review: background PDF page (vector) + text layers (real text, embedded fonts) + image shape layers (with clipping).
- Keep the existing canvas preview unchanged — only the upload and final export change behavior.

## Non-Goals

- No PDF rendering in the browser or storefront. Canvas preview always uses the PNG thumbnail.
- No multi-page PDF support. Only the first page of an uploaded PDF is used.
- No client-side PDF generation. All PDF export happens on the backend.
- No font management UI in v1. Font TTF files are deployed as static assets alongside the Worker.
- No editing or replacing individual PDF pages. Background is a single replaceable file.

## Background Upload

### Flow

1. Admin drags or selects a `.pdf` file in the Background tab or editor drop zone.
2. `BackgroundUpload` posts the file to `POST /api/customizations/assets` (existing endpoint, extended).
3. Backend validates: MIME `application/pdf`, max 20 MB. Returns 415/413 on failure.
4. Backend loads the PDF with `pdf-lib`, reads:
   - Page count
   - First page media box (`width` and `height` in points)
   - Renders page 0 to a PNG buffer via `pdfDoc.embedPng(...)` → save as thumbnail
5. Backend stores:
   - Original PDF → R2: `uploads/{ownerKey}/{id}/original.pdf`
   - PNG thumbnail → R2: `uploads/{ownerKey}/{id}/preview.png`
   - Metadata → `customizationAssets` table: `mimeType=application/pdf`, `pageCount`, `widthPt`, `heightPt`, `previewWidthPx`, `previewHeightPx`
6. Backend returns asset metadata including: `id`, `previewObjectKey`, `pageCount`, `widthPt`, `heightPt`, `previewWidthPx`, `previewHeightPx`.
7. Admin creates `BackgroundAsset` from response:
   - `assetId` = asset ID
   - `previewUrl` = thumbnail GET URL
   - `pdfAssetId` = asset ID
   - `mimeType` = `application/pdf`
   - `widthPx` = `previewWidthPx`
   - `heightPx` = `previewHeightPx`

### Changes to BackgroundAsset (shared)

```ts
type BackgroundAsset = {
  assetId: string;
  previewUrl: string;
  thumbnailAssetId?: string;
  filename?: string;
  mimeType?: string;    // "image/png" | "image/jpeg" | "application/pdf"
  widthPx: number;
  heightPx: number;
  pdfPageCount?: number;
  pdfAssetId?: string;
};
```

### Existing image upload behavior

Unchanged. PNG/JPEG files still upload, store in R2, and create a `BackgroundAsset` with `mimeType: "image/png"` (no `pdfAssetId`).

## Background Upload Endpoint Changes

### `POST /api/customizations/assets`

Accept new MIME type: `application/pdf`.

```ts
const allowedMimeTypes = new Set(["image/png", "image/jpeg", "application/pdf"]);
```

PDF handling:
- Skip binary dimension parsing (existing PNG/JPEG header logic does not apply).
- Use `pdf-lib` to load the PDF document: `PDFDocument.load(bytes)`.
- Read first page: `doc.getPage(0)` → `{ width, height }` in points.
  - Points are the native PDF unit. These become `widthPt` and `heightPt`.
- Render thumbnail: create a new `PDFDocument`, embed page 0, then save and pass the PDF bytes through a PNG encoder. Alternative: use `page.getWidth()`/`page.getHeight()` directly and produce an in-memory PNG via a canvas-like approach.
  - Since Cloudflare Workers have no canvas API, the thumbnail approach needs care. Options:
    a. `pdf-lib` can embed a page into another document, but cannot directly rasterize to PNG.
    b. Use the **SVG export thumbnail approach**: Render the page to a very simple PDF that only contains the page, then accept that the "thumbnail" is actually a low-resolution embedded preview.
    c. Use **Cloudflare Browser Rendering** to render PDF → PNG (heavy, requires binding).
    d. Use a **server-side canvas polyfill** (`@napi-rs/canvas` not available in Workers).
    e. **Simplest: keep a data URL thumbnail from the browser.** The browser can render the PDF to canvas using `pdf.js` and send both the PDF file and the generated PNG thumbnail to the backend in one request.
- **Recommended approach**: client-side PDF → PNG via `pdf.js` in the browser at upload time. The admin's browser generates the PNG thumbnail and sends both files (original PDF + thumbnail) to the backend. This avoids server-side PDF rasterization entirely.
- Fallback: if no thumbnail is provided (e.g., API-only upload), backend can store a placeholder or use the `widthPt`/`heightPt` as the preview dimensions.

### Response format

```ts
{
  // existing fields for images
  id: string;
  objectKey: string;
  previewObjectKey: string;
  mimeType: string;
  widthPx: number;      // from thumbnail or 0 for PDF-only uploads
  heightPx: number;     // from thumbnail or 0 for PDF-only uploads
  byteSize: number;
  // new fields for PDF
  pageCount?: number;
  widthPt?: number;     // PDF media box width in points
  heightPt?: number;    // PDF media box height in points
}
```

## Admin Client-Side PDF To PNG Thumbnail

When an admin uploads a PDF:

1. Read the PDF file as ArrayBuffer.
2. Use `pdfjs-dist` (already supported in modern browsers or via dynamic import) to render page 0 to a `<canvas>` element.
3. Export canvas to PNG Blob via `canvas.toBlob()`.
4. Upload both the original PDF and the PNG thumbnail to the backend in a single request (multipart or sequential).
5. The backend stores both and returns the asset metadata.

If `pdfjs-dist` is too heavy, the alternative is to send the PDF to the backend and generate the thumbnail on the backend:
- Backend loads the PDF, renders page 0 as a full embedded page in a new PDF, then uses `pdf-lib` to produce a small-page-size PDF that serves as the "thumbnail" (not a raster PNG but a small vector preview). The frontend can render this small PDF into an `<iframe>` or embed it.
- This is less ideal for the admin canvas preview which expects an `<img>` tag.

**Decision**: Use `pdfjs-dist` client-side for thumbnail generation. Bundle size impact is acceptable for the admin app (not loaded on storefront). The thumbnail is a small PNG (max 1200px wide).

## Admin Editor UI

### Background Tab

No layout changes. The existing `BackgroundUpload` component:
- Accepts `accept="image/*,application/pdf"`.
- `fileToBackground()` detects PDF by MIME type.
- For PDF: renders thumbnail via `pdf.js` → canvas → blob → upload PDF + thumbnail to backend → receives asset metadata → creates `BackgroundAsset` with `pdfAssetId`.
- For image: existing behavior (local data URL only, no upload).
- Preview on canvas: unchanged — still uses `<img src={background.previewUrl}>`.

### Save And Load

- `background.previewUrl` points to the PNG thumbnail (R2 GET URL or data URL for local images).
- `background.pdfAssetId` is persisted in `blocksJson` as part of the template.
- When loading a template with a PDF background, the canvas renders the PNG thumbnail — no special handling needed.

## Vector PDF Export

### Endpoint

Replace `POST /api/customizations/exports/pdf` with a new implementation that handles PDF backgrounds.

### Input

```ts
{
  template: CustomizationTemplate;
  design: CustomizationDesign;
}
```

The backend resolves the background PDF from `template.background.pdfAssetId`.

### Process

1. Load background PDF from R2 using `pdfAssetId`.
2. Load PDF with `pdf-lib`: `PDFDocument.load(pdfBytes)`.
3. Get page 0 as a template page: `const [bgPage] = await destDoc.embedPages([srcDoc.getPage(0)])`.
4. Create a new `PDFDocument` and add the embedded page: `destDoc.addPage(bgPage)`.
   - The embedded page preserves the original vector content (text paths, vector graphics, images).
5. For each visible, non-hidden `RuntimeLayer` in the design:
   - **Text layers**: 
     a. Load font TTF bytes from static assets or R2 font path.
     b. Embed font: `destDoc.embedFont(fontBytes)`.
     c. Draw text: `page.drawText(text, { x, y, font, size, color })`.
     d. For text paths (ellipse, arc, custom): render character by character along the path. Each character is positioned individually using its advance width and the path tangent at that position.
   - **Image shape layers**:
     a. Load the uploaded image bytes from the design's `previewUrl` (R2).
     b. Embed as PNG or JPEG: `destDoc.embedPng(bytes)` / `destDoc.embedJpg(bytes)`.
     c. Draw with clipping: set `page.pushOperators(ops)` for clip path, then draw the image, then `page.popOperators()`.
6. Return the PDF as binary with `Content-Type: application/pdf`.

### Font Handling

Font TTF files are deployed alongside the Worker as static assets or stored in R2 under a `fonts/` prefix.

```ts
const FONT_MAP: Record<string, string> = {
  "sans_bold": "fonts/SansBold.ttf",
  "serif_display": "fonts/SerifDisplay.ttf",
  "script_elegant": "fonts/ScriptElegant.ttf",
};
```

Each font is loaded once and cached for the duration of the export request.

### Character-By-Character Path Text

For closed_ellipse and other path-based text, the renderer:
1. Measures total text width at the given font size using `font.widthOfTextAtSize(text, size)`.
2. Computes start position based on alignment (left/center/right anchored at `startAngle`).
3. Iterates through characters, each placed at the next position along the path.
4. For each character, computes the path tangent angle and rotates the character.
5. Uses `page.drawText(char, { x, y, size, font, color, rotate: degrees })`.

For `straight` text, simply draw at the geometry position.

### Background Image Fallback

If `pdfAssetId` is missing (image background or legacy template), fall back to the current behavior: embed the background PNG/JPEG as a raster image.

## Database

### customizationAssets table

Add columns:
- `page_count INTEGER` — nullable, only for PDF assets
- `width_pt REAL` — nullable, PDF media box width in points
- `height_pt REAL` — nullable, PDF media box height in points

No new tables. The existing `blocksJson` column already stores the full `BackgroundAsset` object including any new fields.

### Migration

```sql
ALTER TABLE customizationAssets ADD COLUMN page_count INTEGER;
ALTER TABLE customizationAssets ADD COLUMN width_pt REAL;
ALTER TABLE customizationAssets ADD COLUMN height_pt REAL;
```

## Edge Cases

| Case | Handling |
|------|----------|
| PDF with no media box | Default to A4 (595.28 x 841.89 pt) |
| PDF > 20 MB | Reject with 413 |
| PDF thumbnail generation fails | Return error to admin; allow retry |
| Export with missing PDF in R2 | Fallback to raster background (embed PNG thumbnail) |
| Export with no background | Return validation error |
| Font file not found | Fallback to Helvetica for that text layer |
| Different PDF page size vs preview dimensions | Use PDF page dimensions as canonical; thumbnail may be scaled |
| Upload PDF, replace with image | Background becomes image type; PDF not removed from R2 (orphan) |
| Upload image, replace with PDF | Background becomes PDF type; previous image not removed from R2 (orphan) |

## Testing

### Shared Package

- No changes needed (export logic is backend-only).

### Backend

- `POST /api/customizations/assets` with `.pdf` → returns 200 with `pageCount`, `widthPt`, `heightPt`.
- `POST /api/customizations/assets` with `.pdf` → thumbnail generated and stored.
- `POST /api/customizations/assets` with non-PDF non-image → 415.
- `POST /api/customizations/assets` with file > 20 MB → 413.
- `POST /api/customizations/exports/pdf` with PDF background → returns valid PDF (1 page, vector content).
- `POST /api/customizations/exports/pdf` with image background → returns valid PDF (existing behavior).
- `POST /api/customizations/exports/pdf` with text on closed ellipse → text characters follow path in output PDF.
- `POST /api/customizations/exports/pdf` with image shape layer → image embedded with clip path.
- `POST /api/customizations/exports/pdf` with missing background → 422.
- `POST /api/customizations/exports/pdf` with custom font → PDF contains embedded font (not Helvetica).

### Admin (browser)

- Upload `.pdf` file → thumbnail visible on canvas.
- Upload `.pdf` → save template → reload → thumbnail still visible.
- Upload `.pdf` → replace with `.png` → image visible.
- Upload `.png` → replace with `.pdf` → thumbnail visible.

## Verification Plan

```bash
pnpm --filter backend build           # TypeScript + Vite build
pnpm --filter backend check           # tsc --noEmit
pnpm --filter backend db:migrate:local  # apply migration
pnpm --filter admin build             # admin bundle
pnpm --filter @trophy/customization test   # shared package tests
pnpm --filter @trophy/customization check  # shared package typecheck
./init.sh                             # full repo verification
```

End-of-session artifacts:
- `feature_list.json`
- `progress.md`
- `session-handoff.md`
