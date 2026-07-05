# Xoá tags & types hoàn toàn khỏi hệ thống

## What to build

Xoá toàn bộ khái niệm **product tags** và **product types** khỏi hệ thống — từ database schema, API routes, product CRUD logic, admin UI, storefront response, đến mock data và tests.

## Acceptance criteria

### Database schema (`apps/backend/src/db/schema.ts`)

- [ ] Xoá bảng `productTypes`
- [ ] Xoá bảng `productTags`
- [ ] Xoá bảng `productTagLinks`
- [ ] Xoá cột `typeId` khỏi bảng `products`

### Backend — metadata routes (`apps/backend/src/routes/admin/product-metadata.ts`)

- [ ] Xoá `GET /types` và `POST /types`
- [ ] Xoá `GET /tags` và `POST /tags`
- [ ] Xoá imports cho `productTypes`, `productTags`

### Backend — product routes (`apps/backend/src/routes/admin/products.ts`)

- [ ] Xoá `typeId` khỏi `organizeSchema`, `fullCreateOrganizationSchema`, `searchProductsQuerySchema`
- [ ] Xoá `tagIds` khỏi `organizeSchema`
- [ ] Xoá `tagValues` khỏi `fullCreateOrganizationSchema`
- [ ] Xoá `tagId` khỏi `searchProductsQuerySchema`
- [ ] Xoá `validateOrganizeReferences` (hoặc xoá type/tag checks nếu hàm còn collection/category validation)
- [ ] Xoá `resolveOrCreateTagIds`
- [ ] Xoá type/tag eager fetches khỏi `readProduct`
- [ ] Xoá type/tag khỏi `POST /full-create` organization handling
- [ ] Xoá type/tag khỏi `PATCH /:id/organize`
- [ ] Xoá type filtering khỏi `GET /` (list products)
- [ ] Xoá tag filtering khỏi `GET /` (list products)
- [ ] Dọn imports liên quan

### Backend — storefront routes (`apps/backend/src/routes/storefront/products.ts`)

- [ ] Xoá `type` khỏi product detail response (`GET /:handle`)
- [ ] Xoá `typeValue` khỏi listing item (`buildListingItem`)

### Admin — metadata client (`apps/admin/src/lib/product-metadata-client.ts`)

- [ ] Xoá type fetch khỏi `fetchProductMetadata()`
- [ ] Xoá tag fetch khỏi `fetchProductMetadata()`
- [ ] Cập nhật `ProductMetadataSnapshot` type

### Admin — create product flow

- [ ] Xoá `<datalist id="product-tag-suggestions">` khỏi create product page
- [ ] Xoá type/tag khỏi metadata state trong `use-create-product.ts`
- [ ] Xoá type/tag khỏi `submit()` payload

### Admin — product detail

- [ ] Xoá type và tags display khỏi product detail page
- [ ] Xoá `typeId` và `tagIds` khỏi `updateProductOrganization` trong `products-client.ts`

### Admin — types (`apps/admin/src/types.ts`)

- [ ] Xoá `type: string` khỏi `CatalogProduct`
- [ ] Xoá `tags: string[]` khỏi `CatalogProduct`

### Admin — products client (`apps/admin/src/lib/products-client.ts`)

- [ ] Xoá type/tag mapping khỏi `mapApiProductToCatalogProduct`

### Admin — mock data (`apps/admin/src/lib/mock-data.ts`)

- [ ] Xoá `type` và `tags` khỏi mock products

### Tests

- [ ] Cập nhật `apps/backend/src/routes/admin/products.test.ts` — xoá type/tag mock references
- [ ] Cập nhật `apps/backend/src/routes/admin/products.route.test.ts` — xoá tag queue entries
- [ ] Cập nhật `apps/admin/src/lib/products-client.test.ts` — xoá type/tag khỏi mock data

### Verification

- [ ] `pnpm --filter backend check` passes
- [ ] `pnpm --filter backend build` passes
- [ ] `pnpm --filter admin build` passes
- [ ] `pnpm --filter router-cf typecheck` passes
- [ ] `pnpm --filter backend test` passes
- [ ] `./init.sh` passes

## Blocked by

None — can start immediately.
