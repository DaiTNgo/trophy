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

Design principle: background files stay local during draft editing. Only at publish time are assets uploaded to R2 and persisted server-side. This matches the existing image background behavior (data URL in `blocksJson`).

### Draft Flow (Admin Editor)

1. Admin drags or selects a `.pdf` file in the Background tab or editor drop zone.
2. Browser reads the file as `ArrayBuffer`.
3. Browser uses `pdfjs-dist` to render page 0 to a `<canvas>` element:
   - Sets canvas dimensions to match the PDF page size (in points at 72 DPI).
   - Renders page 0 onto the canvas.
4. Canvas exports to PNG data URL via `canvas.toDataURL("image/png")`.
5. PDF metadata extracted from pdf.js: `numPages`, first page `widthPt`/`heightPt`.
6. Browser creates `BackgroundAsset` — all local, no server call:
   - `assetId` = generated client-side ID (temp)
   - `previewUrl` = PNG data URL (from canvas)
   - `filename` = original file name
   - `mimeType` = `"application/pdf"`
   - `widthPx` = canvas width (≈ page width in points at 72 DPI)
   - `heightPx` = canvas height (≈ page height in points at 72 DPI)
   - `pdfPageCount` = `numPages`
   - `pendingPdfUpload` = `true` (flag: still needs upload)
7. The original PDF `ArrayBuffer` is held in the admin editor's local state (template draft).
8. Canvas preview works immediately via the PNG data URL — no server round-trip.

### Save (Draft)

When saving a draft template:
- `background.previewUrl` is the PNG data URL (stored inline in `blocksJson` as JSON).
- The PDF file bytes are NOT uploaded — they are held in local editor state.
- Reloading a draft: the admin sees the PNG thumbnail but cannot export until the template is published (because the original PDF is not on the server yet).

### Publish Flow

1. Admin clicks Publish.
2. Admin editor collects all pending file uploads (background PDF + any uploaded image shape assets that are still local).
3. Upload PDF to `POST /api/customizations/assets`:
   - Sends the original PDF bytes.
   - Also sends the PNG thumbnail data URL (backend stores both).
4. Backend validates MIME `application/pdf`, max 20 MB.
5. Backend reads PDF metadata via `pdf-lib`: `pageCount`, `widthPt`, `heightPt` from first page media box.
6. Backend stores:
   - Original PDF → R2: `uploads/{ownerKey}/{assetId}/original.pdf`
   - PNG thumbnail → R2: `uploads/{ownerKey}/{assetId}/preview.png` (derived from the data URL sent by client)
   - Metadata → `customizationAssets` table
7. Backend returns permanent asset metadata.
8. Admin updates `BackgroundAsset`:
   - `assetId` updated to server-assigned ID
   - `previewUrl` updated to R2 GET URL
   - `pdfAssetId` set to server asset ID
   - `pendingPdfUpload` = `false`
9. Template is saved to DB with the updated `BackgroundAsset`.

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
  pendingPdfUpload?: boolean;  // true if PDF bytes not yet uploaded
};
```

### Existing image background behavior (unchanged)

Image backgrounds stay local in draft (data URL in `previewUrl`, stored inline in `blocksJson`). At publish time the PNG/JPEG is uploaded to R2 the same way as the PDF. This is consistent behavior — all background types follow the same publish-time upload pattern.

## Background Upload At Publish Time

### `POST /api/customizations/assets` (extended)

Used only at publish time, not during draft editing. Accept new MIME type: `application/pdf`.

```ts
const allowedMimeTypes = new Set(["image/png", "image/jpeg", "application/pdf"]);
```

Request accepts multipart or sequential uploads:
1. Original PDF bytes → stored as `original.pdf` in R2.
2. PNG thumbnail (generated client-side) → stored as `preview.png` in R2.

Backend PDF handling:
- Skip binary dimension parsing (existing PNG/JPEG header logic does not apply).
- Use `pdf-lib` to validate the PDF: `PDFDocument.load(bytes)`.
- Read first page: `doc.getPage(0)` → `{ width, height }` in points.
- Points are the native PDF unit (1 pt = 1/72 inch). These become `widthPt` and `heightPt`.
- Store the PNG thumbnail bytes as-is (generated client-side, no backend rasterization needed).

### Response format

```ts
{
  id: string;
  objectKey: string;
  previewObjectKey: string;  // thumbnail key
  mimeType: string;
  widthPx: number;           // thumbnail pixel width
  heightPx: number;          // thumbnail pixel height
  byteSize: number;
  pageCount: number;         // PDF page count
  widthPt: number;           // PDF media box width in points
  heightPt: number;          // PDF media box height in points
}
```

## Admin: PDF To PNG Thumbnail (Client-Side)

When an admin uploads a PDF in the editor:

1. Read the PDF file as `ArrayBuffer`.
2. Use `pdfjs-dist` (dynamic import, admin app only) to render page 0 to a `<canvas>` element.
3. Export canvas to PNG data URL via `canvas.toDataURL("image/png")`.
4. Store the data URL as `background.previewUrl` — no server call.
5. Hold the original PDF `ArrayBuffer` in local editor state for later publish-time upload.

The PNG thumbnail is small (≤ 1200px wide) to keep the `blocksJson` size manageable during draft editing.

## Admin Editor UI

### Background Tab

No layout changes. The existing `BackgroundUpload` component:
- Accepts `accept="image/*,application/pdf"`.
- `fileToBackground()` detects PDF by MIME type.
- For PDF: renders thumbnail locally via `pdfjs-dist` → canvas → data URL → creates `BackgroundAsset` with `pendingPdfUpload: true`. Original PDF bytes held in local state.
- For image: existing behavior (local data URL only, `pendingPdfUpload: false`).
- Preview on canvas: unchanged — still uses `<img src={background.previewUrl}>`.

### Save (Draft)

- `background.previewUrl` is a data URL (stored inline in `blocksJson`).
- `background.pdfAssetId` is null/empty (not uploaded yet).
- `background.pendingPdfUpload` = `true` (if PDF).
- The template can be saved as a draft. Canvas preview works from the data URL.

### Load (Draft)

- Canvas renders the PNG thumbnail via the stored data URL.
- If `pendingPdfUpload` is true, the original PDF file bytes are NOT available (they were only in memory). The admin sees the thumbnail but cannot export until publish re-uploads the PDF.

### Publish

- Admin clicks Publish.
- Background uploads to R2 (see "Background Upload At Publish Time" above).
- `background.previewUrl` updated to R2 GET URL.
- `background.pdfAssetId` set to the R2-stored asset ID.
- `background.pendingPdfUpload` = `false`.
- Template saved to DB.

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
| PDF > 20 MB | Reject with 413 at publish time |
| PDF thumbnail generation fails in browser | Show error toast; allow retry |
| PDF thumbnail in data URL makes blocksJson large | Accept for draft; published template replaces data URL with R2 URL |
| Draft saved before publish — PDF bytes lost | On load, `pendingPdfUpload` is true. Admin sees thumbnail but must re-upload PDF to publish |
| Export with missing PDF in R2 | Fallback to raster background (embed PNG thumbnail) |
| Export with no background | Return validation error |
| Font file not found | Fallback to Helvetica for that text layer |
| Different PDF page size vs preview dimensions | Use PDF page dimensions as canonical; thumbnail may be scaled |
| Upload PDF (draft), replace with image | `BackgroundAsset` becomes PNG type; previous PDF bytes discarded (no server orphan) |
| Upload image (draft), replace with PDF | `BackgroundAsset` becomes PDF type; previous image bytes discarded |
| Background changed between draft save and publish | Publish always uploads the current file |

## Testing

### Shared Package

- No changes needed (export logic is backend-only).

### Backend

- `POST /api/customizations/assets` with `.pdf` → returns 200 with `pageCount`, `widthPt`, `heightPt`.
- `POST /api/customizations/assets` with `.pdf` + PNG thumbnail → both stored in R2.
- `POST /api/customizations/assets` with non-PDF non-image → 415.
- `POST /api/customizations/assets` with file > 20 MB → 413.
- `POST /api/customizations/exports/pdf` with PDF background → returns valid PDF (1 page, vector content).
- `POST /api/customizations/exports/pdf` with image background → returns valid PDF (existing behavior).
- `POST /api/customizations/exports/pdf` with text on closed ellipse → text characters follow path in output PDF.
- `POST /api/customizations/exports/pdf` with image shape layer → image embedded with clip path.
- `POST /api/customizations/exports/pdf` with missing background → 422.
- `POST /api/customizations/exports/pdf` with custom font → PDF contains embedded font (not Helvetica).

### Admin (browser)

- Upload `.pdf` file → thumbnail visible on canvas (data URL).
- Upload `.pdf` → save draft → reload → `pendingPdfUpload` is true, thumbnail still visible.
- Upload `.pdf` → save draft → publish → PDF uploaded to R2 → `pendingPdfUpload` = false.
- Upload `.pdf` → save draft → reload without publishing → `pendingPdfUpload` still true.
- Upload `.pdf` → replace with `.png` → image visible, `pendingPdfUpload` cleared.
- Upload `.png` → replace with `.pdf` → thumbnail visible, `pendingPdfUpload` set.

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
