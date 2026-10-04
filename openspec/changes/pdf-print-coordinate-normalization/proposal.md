## Why

When a PDF background is uploaded for a customizable product, it is currently converted to a high-resolution scale-2.0 WebP image for sharp UI previews, and these doubled dimensions are saved to the database. During print production, this causes the exported PDF to be physically oversized (2x native dimensions) unless the print operator remembers to use "Fit to Page", which introduces risk and manual workarounds. This change standardizes the system to store the native 1.0x PDF point dimensions in the database while still utilizing the 2x WebP image for visual sharpness (like a Retina display), ensuring perfect print sizing automatically.

## What Changes

- Read and store native 1.0x (PDF points) values for the Customization Background `widthPx` and `heightPx` when a PDF is uploaded.
- Treat the 2x WebP image as a high-density display layer, scaled down via CSS (`width: 100%`) within the 1x editor canvas.
- Generate user interaction coordinates in the Customization Editor naturally at the 1x scale.
- Export vector PDFs cleanly at exactly the 1.0x original document size without runtime mathematical scaling.
- **BREAKING**: Existing customization templates stored with 2.0x dimensions will render incorrectly. We explicitly accept this lack of backward compatibility to maintain a clean architecture going forward.

## Capabilities

### New Capabilities
- `pdf-coordinate-normalization`: Storing, editing, and exporting customization backgrounds at 1x physical dimensions while using 2x resolution preview images.

### Modified Capabilities
- None.

## Impact

- File upload logic: `use-product-detail-variants.ts`, `product-detail-customization.tsx`, `variant-media-manager.tsx`, etc., must extract 1x dimensions from the original PDF rather than measuring the generated 2x WebP file.
- UI Layout: The Editor Canvas and preview components must ensure the container uses the 1x dimensions and the background image shrinks to fit.
- Export: `pdf-export.ts` will naturally work correctly at 1x scale.
