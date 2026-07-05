## Why

Collections and Categories currently support an `imageUrl` field in the database, but there is no way for the admin operator to upload and attach media to them via the Admin UI. Adding media upload allows richer merchandising and better visual presentation for both collections and categories.

## What Changes

- Add media upload support to the Category create/edit details screen (`/categories/new` and `/categories/:id`).
- Add media upload support to the Collection create/edit details screen (`/collections/new` and `/collections/:id`).
- Backend schemas for creating Collections and Categories (`POST /collections`, `POST /categories`) will be updated to accept an `imageUrl`.
- The list screens (`index.tsx`) for collections and categories will remain unchanged (no media displayed on lists).

## Capabilities

### New Capabilities
- `collection-media`: Allows uploading and managing media for a product collection.
- `category-media`: Allows uploading and managing media for a product category.

### Modified Capabilities
- (None)

## Impact

- **Backend**: `createCollectionSchema` and `createCategorySchema` in `apps/backend/src/routes/admin/product-metadata.ts` will accept `imageUrl`.
- **Admin UI**: `CollectionDetailPage` and `CategoryDetailPage` in `apps/admin/src/pages/` will include a media upload component utilizing `uploadProductVariantMedia` to handle file uploads.
- **Database**: No migrations needed since `image_url` is already present in `product_collections` and `product_categories` tables.
