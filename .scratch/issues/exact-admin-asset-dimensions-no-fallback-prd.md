---
title: Exact Admin Asset Dimensions With Zero Fallback
labels:
  - ready-for-agent
status: ready-for-agent
---

## Problem Statement

When an admin uploads a PDF file (such as a standard A4 blank) as the Customization Media for a customizable product, the dimensions returned after full creation change unexpectedly from the client-measured `1190 x 1683 px` to a hardcoded `800 x 1131 px`.

From the admin's perspective, this causes:
1. Distorted canvas dimensions and incorrect aspect ratios during subsequent editing.
2. Inconsistent coordinates between the design preview on the admin canvas and what shoppers see on the storefront.
3. Silent overriding of intentional design dimensions by backend defaults, eroding trust in the admin product creation flow.

This happens because the backend previously lacked awareness of client-measured dimensions for PDF assets and fell back to an arbitrary hardcoded default of `800 x 1131 px`, which was subsequently used to derive the product's customization canvas width and height.

## Solution

Establish the Admin Frontend as the single source of truth for asset and canvas dimensions. 

1. **Client-Preserved Dimensions:** When an admin uploads media (raster or PDF) during full product creation or variant management, the client measures and includes `widthPx` and `heightPx` in the request payload alongside the binary files.
2. **Zero Backend Fallback:** The backend eliminates all hardcoded fallback dimensions (specifically `800 x 1131 px`). The backend trusts and persists the dimensions declared by the admin. If an asset cannot resolve dimensions from the client declaration, a generated preview image, or binary image headers, the request is rejected with a validation error.
3. **Canvas Dimension Precedence:** When creating or updating a customizable product, the customization canvas dimensions explicitly sent by the admin take precedence over asset-derived heuristics.
4. **Standardized PDF Scale:** PDF assets are consistently rasterized client-side for canvas preview at Scale 2.0 (144 DPI), rendering standard A4 documents accurately at `1190 x 1683 px`.
5. **Publish-Only Dimension Parity:** Draft mode permits work-in-progress customization with partial assets, but publishing strictly requires that all variant customization media share identical pixel dimensions that match the product's customization canvas dimensions.

## User Stories

1. As an admin, I want the backend to store the exact pixel dimensions I submit for a customization PDF blank, so that my product canvas does not shrink or distort after saving.
2. As an admin, I want A4 PDF blanks to produce an exact canvas size of `1190 x 1683 px` based on Scale 2.0 (144 DPI), so that my editor canvas remains sharp on high-DPI screens.
3. As an admin, I want the full-create API to accept `widthPx` and `heightPx` inside each variant's `media` and `customizationMedia` declarations, so that dimensions are explicitly recorded on created assets.
4. As an admin, I want the full-create response to return the exact dimensions I submitted, so that my local state matches the backend catalog state.
5. As an admin, I want the backend to reject PDF uploads that have no declared dimensions and no preview file, so that accidental unmeasured assets are never silently corrupted with dummy dimensions.
6. As an admin, I want raster images (PNG, JPEG, WebP) to have their dimensions declared by the client or verified via image headers, so that asset metadata is always trustworthy.
7. As an admin, I want the customization canvas dimensions (`canvasWidthPx` and `canvasHeightPx`) sent in the create payload to be respected, rather than overridden by arbitrary heuristics.
8. As an admin, I want to save draft customizable products even if variant background dimensions are not yet finalized, so that I can pause and resume product setup.
9. As an admin, I want publishing a customizable product to fail if any variant background has different dimensions from the canvas, so that shoppers never see misaligned customization layers.
10. As an admin, I want publishing a customizable product to fail if variant backgrounds have differing dimensions from one another, so that layer placement is consistent across all product blanks.
11. As an admin, I want replacing a customization background on an existing product to enforce the existing canvas dimensions, so that existing text and image layers do not shift out of frame.
12. As an admin, I want atomic variant creation to accept explicit `widthPx` and `heightPx` on gallery and customization media, so that single-variant additions maintain strict dimension contracts.
13. As an admin, I want variant background replacement in Product Detail to accept explicit dimensions, so that detail maintenance respects the single source of truth.
14. As an operator, I want exported order PDFs to use the exact dimensions established by the customization template, so that vector export matches the production blank size.
15. As a shopper, I want the storefront customization preview container to maintain the exact aspect ratio of the product blank, so that my customized design represents the finished physical award.
16. As a developer, I want all instances of hardcoded `800 x 1131` fallback dimensions removed from backend routes, so that there is no hidden legacy sizing behavior.
17. As a developer, I want the backend API contracts to validate that declared dimensions are positive integers, preventing malformed or negative dimensions from entering the database.
18. As a developer, I want clear multipart parsing contracts where client declarations take precedence over byte inspection, so that Cloudflare Workers isolates do not need heavyweight DOM or Canvas rendering polyfills.

## Implementation Decisions

1. **Admin Frontend as Single Source of Truth:**
   The admin client measures image dimensions via standard browser `Image` elements and PDF dimensions via `pdfjs` at a fixed Scale of 2.0 (144 DPI). The backend does not attempt to re-render or re-estimate PDF dimensions, trusting the admin's measurement.

2. **Strict Media Schema Contract:**
   `fullCreateProductSchema` and `atomicVariantCreateSchema` are updated to accept optional positive integers for `widthPx` and `heightPx` on each variant's `media` item and `customizationMedia` declaration:
   ```typescript
   media: v.array(v.object({
     mediaId: mediaIdSchema,
     widthPx: v.optional(v.pipe(v.number(), v.integer(), v.minValue(1))),
     heightPx: v.optional(v.pipe(v.number(), v.integer(), v.minValue(1))),
   })),
   customizationMedia: v.optional(v.nullable(v.object({
     mediaId: mediaIdSchema,
     widthPx: v.optional(v.pipe(v.number(), v.integer(), v.minValue(1))),
     heightPx: v.optional(v.pipe(v.number(), v.integer(), v.minValue(1))),
   }))),
   ```

3. **Elimination of Hardcoded Fallbacks:**
   The hardcoded fallback `{ width: 800, height: 1131 }` is deleted across all backend endpoints:
   - `product-full-create-multipart.ts`
   - `product-atomic-variant-multipart.ts`
   - `product-variant-media-management-route.ts`
   - `product-assets.ts`

4. **Dimension Resolution Priority:**
   For any uploaded file, the backend resolves dimensions in the following order:
   - Priority 1: Explicit client declaration (`declared.widthPx` and `declared.heightPx`) from the variant media or customization canvas payload.
   - Priority 2: Preview image inspection (`readImageDimensions` on the WebP preview buffer, if provided).
   - Priority 3: Binary header inspection for non-PDF image files (`readImageDimensions` on PNG, JPEG, or WebP buffer).
   - If none of the above yields valid positive dimensions, the request fails with validation error `Media data is invalid or unsupported` (or `422 Missing PDF dimensions in upload request`).

5. **Canvas Dimension Derivation Priority:**
   `deriveCustomizationCanvas` checks if `customization.canvasWidthPx` and `canvasHeightPx` were supplied in the payload. If present and positive, they are used directly. If absent, dimensions are derived from the first valid variant `customizationMedia` asset.

6. **Publish Readiness Enforcement:**
   `validateCustomizationPublishReadiness` and `validatePublishable` require that every variant has a customization media asset and that all customization media assets have `widthPx` and `heightPx` identical to each other and identical to the customization canvas dimensions.

7. **Strict Canvas Match on Background Replacement:**
   When replacing a variant customization background on an existing customizable product, the replacement asset's dimensions must match the existing canvas dimensions.

## Testing Decisions

1. **High-Level Seam Selection:**
   Tests assert external HTTP behavior at the highest useful seam rather than testing internal helper functions in isolation:
   - **Primary Seam:** Backend Product Full-Create API (`POST /api/admin/products/full-create`) tested through Hono `productCommandRoute.request('/full-create', ...)`.
   - **Secondary Seam:** Admin Products Client (`createFullProduct`) tested via Vitest with mocked fetch to verify multipart payload serialization.

2. **Behavioral Assertions:**
   - Verify that an uploaded PDF asset with declared dimensions `1190 x 1683` results in persisted asset dimensions of `1190 x 1683` and canvas dimensions of `1190 x 1683`.
   - Verify that a PDF asset uploaded without dimensions and without preview is rejected with an HTTP 400 validation error (no silent fallback).
   - Verify that draft product creation succeeds with incomplete customization dimensions, while publish mode rejects mismatched variant or canvas dimensions.

3. **Prior Art:**
   - `apps/backend/src/routes/admin/product-full-create-multipart.test.ts`
   - `apps/backend/src/routes/admin/product-command-route-full-create.test.ts`
   - `apps/admin/src/lib/products-client.test.ts`

## Out of Scope

- Server-side PDF rasterization or parsing engines (e.g. pdf-lib / Ghostscript / Cairo) inside Cloudflare Workers isolates.
- Multi-scale or user-configurable DPI selectors in the admin product creation modal (fixed at Scale 2.0 / 144 DPI).
- Database migrations or backfills for existing historical products that previously acquired `800 x 1131 px`.
- CMYK to RGB color profile conversion.

## Further Notes

- **A4 Geometry Standard:** Standard A4 dimensions in PDF points are $595.28 \times 841.89\text{ pt}$ ($210 \times 297\text{ mm}$ at 72 points/inch). When rendered at Scale 2.0 (144 DPI), the resulting pixel dimensions are:
  $$\text{Width} = \text{round}(595.28 \times 2) = 1190\text{ px}$$
  $$\text{Height} = \text{round}(841.89 \times 2) = 1683\text{ px}$$
  Aspect ratio is $1190 / 1683 \approx 0.70707$, preserving the true A4 aspect ratio ($1 / \sqrt{2} \approx 0.70711$).
