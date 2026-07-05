## 1. Top-Level Public Asset Router

- [x] 1.1 Create `apps/backend/src/routes/assets/index.ts` to define the top-level public router.
- [x] 1.2 Move `GET /:id/content` logic from `admin/product-assets.ts` to `assets/products.ts`.
- [x] 1.3 Move `GET /:id/content` logic from `admin/brand-assets.ts` to `assets/brands.ts`.
- [x] 1.4 Move `GET /:id/content` and `GET /:id/preview` logic from `storefront/customization-assets.ts` to `assets/customizations.ts`.
- [x] 1.5 Mount the new `/api/assets` route in `apps/backend/src/index.ts`.

## 2. Clean Up Redundant Routes

- [x] 2.1 Remove `GET /:id/content` from `apps/backend/src/routes/admin/product-assets.ts`.
- [x] 2.2 Remove `GET /:id/content` from `apps/backend/src/routes/admin/brand-assets.ts`.
- [x] 2.3 Remove `GET /:id/content` and `GET /:id/preview` from `apps/backend/src/routes/admin/customization-assets.ts`.
- [x] 2.4 Delete `apps/backend/src/routes/storefront/product-assets.ts`.
- [x] 2.5 Remove `GET /:id/content` and `GET /:id/preview` from `apps/backend/src/routes/storefront/customization-assets.ts`.

## 3. Update Database Serializers

- [x] 3.1 Update `contentUrl` formatting in `apps/backend/src/routes/admin/products.ts` to use `/api/assets/products/:id/content`.
- [x] 3.2 Update `contentUrl` formatting in `apps/backend/src/routes/storefront/products.ts` to use `/api/assets/products/:id/content`.
- [x] 3.3 Update `contentUrl` formatting in all `customization-assets` serializers (Admin and Storefront) to `/api/assets/customizations/:id/content`.
- [x] 3.4 Update `contentUrl` formatting in all `brand-assets` serializers.
- [x] 3.5 Check and update Storefront `orders.ts` if it references asset URLs.

## 4. Frontend Refactoring

- [x] 4.1 Revert `apps/admin/src/components/ui/admin-media.tsx` to stop using `backendFetch` and Blob URLs for images, relying on standard `src` attributes pointing to `/api/assets/*`.
- [x] 4.2 Verify frontend Admin uploads still work and display correctly.
- [x] 4.3 Run `pnpm --filter backend check` and `pnpm --filter admin build` to ensure no typing or routing errors remain.
