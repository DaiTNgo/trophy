## 1. Extract Dimensions on Upload

- [x] 1.1 In `apps/admin/src/pages/product-detail/variant-media-manager.tsx`, update the `replaceBackground` function to read the 1x dimensions of the PDF rather than the dimensions of the generated WebP preview file.
- [x] 1.2 In `apps/admin/src/pages/product-detail/product-detail-customization.tsx`, update `handleUpload` to extract the 1x dimensions directly from the PDF context before saving the dimensions to the database.
- [x] 1.3 In `apps/admin/src/pages/product-detail/use-product-detail-variants.ts`, ensure any other logic related to extracting dimensions for the preview file correctly measures the PDF at `scale: 1.0`.

## 2. Standardize Image Utilities

- [x] 2.1 Investigate if `apps/admin/src/lib/pdf-preview.ts` needs a new utility function (e.g. `getPdfDimensions`) that returns the 1.0x point dimensions safely, separate from the 2.0x image generation logic.
- [x] 2.2 Refactor the upload points in Step 1 to use this new utility, ensuring that the database `widthPx` and `heightPx` fields accurately reflect the exact PDF points.

## 3. Verify Editor Display and PDF Export

- [x] 3.1 Test the admin Customization Editor rendering: Verify that the background WebP scales correctly to fit the 1x CSS boundaries and user blocks generate 1x coordinates.
- [x] 3.2 Test the storefront Customization Preview rendering: Ensure the shopper's view handles the Retina-like display appropriately with the new dimensions.
- [x] 3.3 Test PDF Export (`exportVectorPdfClientSide`): Perform an end-to-end PDF export test. Verify that the output PDF physical point dimensions exactly match the original uploaded PDF.
