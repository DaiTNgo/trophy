## Context

We want to allow admin users to upload media for Product Collections and Categories. The database schema already supports `imageUrl` for `product_collections` and `product_categories`. The `PUT` endpoints for both metadata resources also already support `imageUrl`. However, the creation (`POST`) endpoints and the Admin UI details screens lack support for this field.

## Goals / Non-Goals

**Goals:**
- Allow admin operators to upload images (and PDFs, supported by existing asset endpoints) for collections and categories on their creation and edit screens.
- Keep the collections and categories list screens clean; do not display images on the list screens.

**Non-Goals:**
- Do not migrate or alter the database schema (already supports `image_url`).
- Do not implement custom thumbnailing or new asset endpoints; reuse existing `product_assets` functionality if possible.

## Decisions

- **Media Upload Strategy**: We will utilize the existing `uploadProductVariantMedia` client function which hits the `POST /api/admin/products/assets` endpoint. This returns a `contentUrl` which we will save directly to the `imageUrl` property of the collection/category. Even though the endpoint is under `/products/assets`, the asset infrastructure handles generic media files correctly, and the `ownerKey` will simply be tied to the uploading admin user. 
- **Admin UI Integration**: We will build an Image Upload component (similar to `ProductDetailThumbnail`) inside `CollectionDetailPage` and `CategoryDetailPage`. It will display the current `imageUrl`, allow the user to select a new file, and upload it to get the URL before calling `handleSave`.
- **Backend Schema Update**: We will update `createCollectionSchema` and `createCategorySchema` in `apps/backend/src/routes/admin/product-metadata.ts` to include `imageUrl: v.optional(v.nullable(v.string()))` to allow passing the uploaded image URL during creation.

## Risks / Trade-offs

- [Risk] Reusing the `product_assets` endpoint for collections/categories might feel semantically misaligned.
  → Mitigation: The underlying `productAssets` table uses an `ownerKey` bound to the user session, not strictly a product. It serves effectively as a generic "admin asset" upload for product metadata.
