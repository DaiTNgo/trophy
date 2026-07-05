## Context

The customization editor currently only accepts PNG/JPEG background images stored as local data URLs. The PDF export route (`POST /api/customizations/exports/pdf`) is a scaffold — it uses pdf-lib's standard Helvetica font, does not embed the background image, does not support text paths, and outputs a raster-quality PDF unsuitable for production.

Admins need to upload vector PDF cup templates as backgrounds and export final designs as true vector PDFs for manufacturing. The background PDF must stay local during draft editing to avoid premature uploads, and only be persisted to R2 at publish time — consistent with the existing image background behavior.

## Goals / Non-Goals

**Goals:**
- Upload `.pdf` files as template backgrounds via the admin Background tab.
- Render a PNG thumbnail client-side (via `pdfjs-dist`) for canvas preview — no server round-trip during editing.
- Store PDF template and PNG thumbnail in R2 only at publish time via the existing asset upload endpoint.
- Export a vector PDF at order review: original PDF page (vector) + shopper text (real text with embedded TTF fonts) + image shape layers (clipped to shape).
- Add `page_count`, `width_pt`, `height_pt` metadata columns to `customizationAssets`.
- Deploy font TTF files alongside the Worker for embeddable text rendering.

**Non-Goals:**
- No browser-side PDF rendering in the storefront.
- No multi-page PDF support — only page 0 of an uploaded PDF is used.
- No client-side PDF generation — all export is server-side.
- No font management UI — font files are deployed as static assets.
- No changes to the storefront app.

## Decisions

1. **Client-side thumbnail via pdfjs-dist (not server-side rasterization).**  
   Cloudflare Workers have no canvas API. Server-side PDF-to-PNG would require Browser Rendering (heavy, costly) or a WASM-based renderer. Generating the PNG thumbnail in the admin's browser via `pdfjs-dist` is simpler, zero-cost, and the admin app already has a browser environment. The thumbnail is small (≤1200px wide) to keep `blocksJson` size manageable in draft.

2. **Publish-time upload only (not during draft save).**  
   Matches the existing image background pattern. Draft templates store `previewUrl` as a data URL in `blocksJson`. The PDF bytes are held in local editor state. On publish, they upload to R2 and the `BackgroundAsset` updates to point to the permanent R2 URL. This avoids uploading files that may be discarded during iteration.

3. **pdf-lib embedPages for vector background preservation.**  
   pdf-lib's `embedPages()` copies a page from a source PDF into a destination document as a Form XObject. This preserves the original vector content (paths, text, embedded images). The alternative — rasterizing the PDF page as an image — would lose vector quality entirely.

4. **Character-by-character path text rendering in PDF.**  
   pdf-lib has no native text-on-path API. For closed_ellipse and other path-based text, each character is placed individually using `font.widthOfTextAtSize()` and positioned along the path with rotation. Straight text uses a single `page.drawText()` call. This is more complex but necessary for accurate path rendering in the production PDF.

5. **Font TTF files deployed as Worker assets.**  
   Font files are static and change rarely. Deploying them alongside the Worker (via `assets` in `wrangler.jsonc`) avoids R2 latency on every export request. Each font is loaded once per request and cached. If a font is missing, the renderer falls back to Helvetica.

6. **pdfjs-dist as admin-only dependency.**  
   `pdfjs-dist` is added to `apps/admin/package.json` only. The storefront has no PDF rendering need. The admin app is bundled by Vite — dynamic import (`import("pdfjs-dist")`) ensures it does not block initial page load.

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| `pdfjs-dist` bundle size (~5MB) increases admin build time | Dynamic import only; never loaded on storefront. Vite code-splits it into a separate chunk. |
| Draft saved with PDF bytes in memory — user navigates away, bytes lost | On reload, `pendingPdfUpload` flag informs the admin that they must re-upload. Canvas thumbnail is still visible. |
| pdf-lib `embedPages` may not preserve all PDF features (transparency, blending modes, complex gradients) | Accept limitation — cup template PDFs are typically single-page vector artwork without complex effects. If rendering is incorrect, fall back to embedding thumbnail as raster. |
| Font TTF deployment requires Worker `assets` config change | Add `assets.directory` to `wrangler.jsonc` for the backend. Only needed once. |
| Parallel publish requests could upload the same PDF twice | Locking is out of scope for v1. Duplicate uploads create orphan R2 objects. Acceptable until a cleanup job exists. |
