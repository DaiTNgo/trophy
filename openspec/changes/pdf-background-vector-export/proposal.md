## Why

The customization template editor currently only accepts PNG/JPEG background images stored as data URLs. For production cup artwork, admins need to upload vector PDF cup templates as the background layer. The SVG and PDF export paths are also scaffold-quality — the PDF output uses Helvetica, has no background, and does not support vector paths or embedded fonts. To produce real production-ready artwork, the export must output a true vector PDF with the original background PDF page, embedded fonts, and proper text/image overlay.

## What Changes

- Accept `.pdf` files as template background in the admin customization editor.
- Generate a PNG thumbnail client-side via `pdfjs-dist` for canvas preview — PDF file stays local during draft, uploads to R2 only at publish time.
- Add `page_count`, `width_pt`, `height_pt` columns to the `customizationAssets` D1 table to store PDF metadata.
- Extend `POST /api/customizations/assets` to accept `application/pdf` files plus a client-generated PNG thumbnail.
- Rewrite `POST /api/customizations/exports/pdf` to produce a vector PDF that embeds the original background PDF page as a template, overlays text with embedded fonts (TTF), and clips image shapes.
- Deploy font TTF files alongside the Worker for PDF font embedding.
- Add `pdfjs-dist` as an admin-only dependency for client-side PDF-to-PNG rendering.

## Capabilities

### New Capabilities

- `pdf-background-upload`: Accept PDF files as admin editor background, including client-side thumbnail generation, publish-time R2 storage, and editor UI integration.
- `vector-pdf-export`: Full vector PDF export with embedded background page, shopper text overlay with real fonts, and image shape clipping.

### Modified Capabilities

_(No existing specs are modified — all capabilities are new.)_

## Impact

- **packages/customization**: `BackgroundAsset` type gains optional PDF fields (`pdfPageCount`, `pdfAssetId`, `pendingPdfUpload`).
- **apps/backend**: `customization-assets.ts` extended for PDF MIME; `render.ts` rewritten for vector PDF output; DB migration for `customizationAssets` table.
- **apps/admin**: `customization-template-ui.tsx` updated to accept PDF files; `pdfjs-dist` dependency added; publish flow extended to upload background assets.
- **apps/storefront**: No changes (canvas preview still uses `BackgroundAsset.previewUrl` which is a PNG thumbnail).
- **Dependencies**: Add `pdfjs-dist` to `apps/admin/package.json`; font TTF files deployed with backend Worker.
