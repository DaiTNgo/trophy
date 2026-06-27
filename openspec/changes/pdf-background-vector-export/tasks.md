## 1. Shared Package — Type Changes

- [x] 1.1 Add optional PDF fields to `BackgroundAsset` type: `pdfPageCount`, `pdfAssetId`, `pendingPdfUpload`
- [x] 1.2 Add `"application/pdf"` to allowed MIME types in constants (if centralized)

## 2. Backend — Database Migration

- [x] 2.1 Add `page_count INTEGER`, `width_pt REAL`, `height_pt REAL` columns to `customizationAssets` table in `apps/backend/src/db/schema.ts`
- [x] 2.2 Generate and apply migration for the new columns

## 3. Backend — Asset Upload Endpoint

- [x] 3.1 Add `"application/pdf"` to `allowedMimeTypes` in `apps/backend/src/lib/asset-utils.ts`
- [x] 3.2 Extend `POST /api/customizations/assets` to handle `application/pdf`: validate with pdf-lib, read page count and media box dimensions
- [x] 3.3 Accept optional PNG thumbnail upload alongside PDF bytes
- [x] 3.4 Store PDF as `original.pdf` and thumbnail as `preview.png` in R2 under the same asset key
- [x] 3.5 Store PDF metadata (`page_count`, `width_pt`, `height_pt`) in `customizationAssets` table
- [x] 3.6 Return extended response with `pageCount`, `widthPt`, `heightPt`

## 4. Backend — Vector PDF Export

- [x] 4.1 Rewrite `renderPdf()` in `apps/backend/src/routes/customizations/render.ts`:
  - Load background PDF from R2 via `pdfAssetId`
  - Embed page 0 as Form XObject using `pdfDoc.embedPages()`
  - For image backgrounds (fallback): embed PNG/JPEG as raster
- [x] 4.2 Implement straight text rendering: embed font, draw at geometry position with correct size/color/alignment
- [x] 4.3 Implement path text rendering: character-by-character positioning on closed_ellipse, arc paths
- [x] 4.4 Implement image shape layer rendering: embed image with clip path matching shape type
- [x] 4.5 Add font loading: load TTF bytes from Worker assets, cache per request, embed via `pdfDoc.embedFont()`
- [x] 4.6 Add background image fallback for templates without `pdfAssetId`
- [x] 4.7 Set correct response headers (`Content-Type: application/pdf`, `Content-Disposition`)
- [x] 4.8 Handle edge cases: missing PDF in R2 → fallback, missing font → Helvetica, no background → 422

## 5. Backend — Font Deployment

- [x] 5.1 Add font TTF files (`SansBold.ttf`, `SerifDisplay.ttf`, `ScriptElegant.ttf`) to a `fonts/` directory
- [x] 5.2 Configure Worker `assets` in `apps/backend/wrangler.jsonc` to serve font files
- [x] 5.3 Add font loading helper in backend: `loadFont(fontId): Promise<Uint8Array>`

## 6. Admin — PDF Background Upload UI

- [x] 6.1 Add `pdfjs-dist` dependency to `apps/admin/package.json`
- [x] 6.2 Implement client-side PDF-to-PNG thumbnail in `fileToBackground(): read PDF as ArrayBuffer → render page 0 with pdfjs-dist → canvas → data URL
- [x] 6.3 Update `BackgroundUpload` component accept: `accept="image/*,application/pdf"`
- [x] 6.4 Store PDF `ArrayBuffer` in local template editor state
- [x] 6.5 Create `BackgroundAsset` with `pendingPdfUpload: true` for PDF files
- [x] 6.6 Show/hide the "pending upload" indicator in the Background panel when `pendingPdfUpload` is true
- [x] 6.7 Handle PDF thumbnail generation errors with toast

## 7. Admin — Publish Flow With Asset Upload

- [x] 7.1 Extend publish handler to collect pending background file uploads
- [x] 7.2 Send PDF bytes + PNG thumbnail to `POST /api/customizations/assets` during publish
- [x] 7.3 Update `BackgroundAsset` with server-assigned `assetId`, `previewUrl`, `pdfAssetId`
- [x] 7.4 Set `pendingPdfUpload = false` after successful upload
- [x] 7.5 Handle publish failure: restore previous `BackgroundAsset` state, show error toast

## 8. Verification

- [x] 8.1 Verify `pnpm --filter backend build` and `pnpm --filter backend check`
- [x] 8.2 Verify `pnpm --filter backend db:migrate:local`
- [x] 8.3 Verify `pnpm --filter admin build`
- [x] 8.4 Verify `pnpm --filter @trophy/customization test`
- [x] 8.5 Verify `./init.sh`
- [x] 8.6 Update `feature_list.json`, `progress.md`, `session-handoff.md`
