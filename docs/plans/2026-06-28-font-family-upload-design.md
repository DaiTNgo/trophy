# Font Family Upload Form Design

## Overview
This design outlines the implementation for uploading TTF font variants during the creation of a new Font Family in the Admin dashboard. We will use a Single-Step Form approach.

## Components

### 1. Admin Brand Assets Page (`apps/admin/src/pages/brand-assets.tsx`)
- Extend the "Add Font Family" form to include 4 file input fields for the 4 font variants: `Regular`, `Bold`, `Italic`, and `Bold Italic`.
- Use the `@medusajs/ui` `Input type="file"` or standard file inputs for each variant.
- Add local React state to hold the selected `File | null` for each variant.

### 2. Upload Logic
- When the user clicks "Create Family", intercept the submission.
- For each variant that has a selected `File`, make a `POST` request to `/api/brand-assets/fonts/upload` with the `File` as the body and the `Content-Type: font/ttf` header.
- Collect the returned `assetId` for each successfully uploaded variant.
- If an upload fails, display an error message and halt the family creation.

### 3. Font Family Creation
- Once all variant uploads are complete, construct the payload for the font family creation:
  ```json
  {
    "id": "fontId",
    "name": "fontName",
    "regularAssetId": "assetId1",
    "boldAssetId": "assetId2",
    "italicAssetId": "assetId3",
    "boldItalicAssetId": "assetId4"
  }
  ```
- Send a `POST` request to `/api/brand-assets/fonts` with this payload.
- Upon success, clear all input fields (including file selections) and refresh the fonts table.

## Data Flow
1. User selects TTF files via browser inputs.
2. React state stores `File` objects.
3. On submit, `fetch` calls send files directly to Backend Worker (`/api/brand-assets/fonts/upload`).
4. Backend Worker streams files to R2 bucket and returns `assetId`.
5. Frontend gathers all `assetId`s and submits to Backend Worker (`/api/brand-assets/fonts`).
6. Backend Worker inserts row into D1 `font_families` table.

## Trade-offs
- **Pros:** Fast and simple for users who have all font files ready at creation time.
- **Cons:** If a user wants to upload a missing variant later, they cannot do it through this UI. (Future enhancement could add an edit modal).
- **Error Handling:** If one of the uploads fails, the process is aborted. This might leave orphaned files in R2, but avoids creating an incomplete font family record.

## Dependencies
- Backend endpoints for upload (`/api/brand-assets/fonts/upload`) and creation (`/api/brand-assets/fonts`) already exist and are fully functional. No backend changes required.
