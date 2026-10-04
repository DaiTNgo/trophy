## Context

Currently, when a user uploads a PDF for a customization background, the system uses `pdf.js` to render the first page of the PDF to a high-resolution WebP image using `scale: 2.0` for a sharp preview in the storefront. However, it extracts and saves the `widthPx` and `heightPx` properties directly from this generated 2x WebP image. This leads to the editor operating on a 2x coordinate system, which results in exported PDFs (for printing) having double the physical size of the original PDF. 

## Goals / Non-Goals

**Goals:**
- Extract the 1x dimensions (in PDF points) from the original PDF directly, and store those as the template's `widthPx` and `heightPx`.
- Let the editor canvas use the 1x dimensions, naturally emitting 1x user coordinates.
- Ensure the 2x WebP image perfectly fills the 1x canvas (`width: 100%`) visually acting like a high-DPI/Retina asset.
- Produce 1x-sized output PDFs automatically through the existing `pdf-export.ts` without changes to its internal mathematical logic.

**Non-Goals:**
- We explicitly do not want to introduce mathematical workarounds (like dividing coordinates by 2) during PDF export.
- We explicitly exclude backward compatibility or data migration for old templates (the lack of a migration script is an accepted consequence).

## Decisions

**Decision 1: Extract Dimensions from `pdfjs` Viewport**
We will update `convertPdfToImageFile` or the surrounding upload logic in `use-product-detail-variants.ts`, `product-detail-customization.tsx`, and `variant-media-manager.tsx`. Rather than waiting for the WebP Blob to be returned and measuring it, we will read `viewport.width` and `viewport.height` using `scale: 1.0` (or dividing the `scale: 2.0` viewport by 2) and return those exact dimensions alongside the generated file.

*Alternative considered:* Wait until the WebP image is measured in the UI component and divide its width/height by 2. *Rejected* because it's safer and more authoritative to get the exact point dimensions from `pdf.js` directly before any rounding or rendering artifacts.

**Decision 2: CSS Constraints on Preview Images**
The Editor and Preview components must make sure that the image tag (or background) is constrained strictly by the `widthPx` and `heightPx` values from the database, ignoring the natural pixel dimensions of the 2x WebP image.

*Alternative considered:* Scaling the HTML Canvas element itself. *Rejected* as standard CSS is sufficient (via `width: 100%` or similar sizing relative to its container).

## Risks / Trade-offs

- **Risk: Breaking existing templates** → Old templates stored their `widthPx` / `heightPx` as 2.0x values. Because we are keeping the UI simple and deliberately rejecting backward compatibility, these old templates will render incorrectly (they will appear 2x larger than they should be, and coordinate tracking will be broken).
*Mitigation*: This has been explicitly accepted for this implementation. Operators will need to re-upload PDFs for older templates if they encounter issues, or start fresh.
