## 1. Backend Updates

- [x] 1.1 Update `createCollectionSchema` and `createCategorySchema` in `apps/backend/src/routes/admin/product-metadata.ts` to accept `imageUrl: v.optional(v.nullable(v.string()))`.
- [x] 1.2 Update the `POST /collections` and `POST /categories` handlers to pass the `imageUrl` field when inserting into the database.

## 2. Admin UI: Collections

- [x] 2.1 Update `apps/admin/src/pages/collections/detail.tsx` to add `imageUrl` state.
- [x] 2.2 Add an Image Upload UI component in `collections/detail.tsx` that calls `uploadProductVariantMedia` when a file is selected.
- [x] 2.3 Include the `imageUrl` when calling the backend to create/update the collection.

## 3. Admin UI: Categories

- [x] 3.1 Update `apps/admin/src/pages/categories/detail.tsx` to add `imageUrl` state.
- [x] 3.2 Add an Image Upload UI component in `categories/detail.tsx` that calls `uploadProductVariantMedia` when a file is selected.
- [x] 3.3 Include the `imageUrl` when calling the backend to create/update the category.

## 4. Verification

- [x] 4.1 Verify creating a new collection with an image works.
- [x] 4.2 Verify updating an existing collection with a new image works.
- [x] 4.3 Verify creating a new category with an image works.
- [x] 4.4 Verify updating an existing category with a new image works.
