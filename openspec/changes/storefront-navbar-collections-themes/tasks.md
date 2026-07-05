## 1. Backend — Collections List Endpoint

- [x] 1.1 Add `GET /` handler to `storefront/collections.ts` returning all collections ordered by `position`
- [x] 1.2 Add route-level test for `GET /api/storefront/collections` returning ordered collections
- [x] 1.3 Verify `pnpm --filter backend test` passes

## 2. Storefront — Root Loader & API Client

- [x] 2.1 Add `fetchStorefrontCollections()` to `app/lib/api.ts` returning `StorefrontCollection[]`
- [x] 2.2 Add root loader to `app/root.tsx` that fetches categories + collections in parallel
- [x] 2.3 Export root loader types so child routes can use `useRouteLoaderData`

## 3. Storefront — Dynamic Navbar

- [x] 3.1 Rewrite `Navbar.tsx` to accept categories/collections as props from root loader data
- [x] 3.2 Build shared `MegaMenuGrid` sub-component for grid layout with image/fallback
- [x] 3.3 Wire SẢN PHẨM mega menu to categories data, linking to `/products?category=<handle>`
- [x] 3.4 Wire CHỦ ĐỀ mega menu to collections data, linking to `/collections/<handle>`
- [x] 3.5 Wire bottom category row to categories data
- [x] 3.6 Remove all hardcoded category arrays, fake items, and Material Symbols icon references
- [x] 3.7 Handle null `image_url` with a placeholder in grid cells

## 4. Storefront — Collection Page Route

- [x] 4.1 Add route `collections/:handle` in `app/routes.ts`
- [x] 4.2 Create `app/routes/collections.$handle.tsx` with loader using `fetchStorefrontCollectionProducts()`
- [x] 4.3 Add breadcrumbs + product grid + pagination (mirror products listing layout)
- [x] 4.4 Handle empty collection state

## 5. Verification

- [x] 5.1 Run `pnpm --filter backend test`, `pnpm --filter backend check`, `pnpm --filter backend build`
- [x] 5.2 Run `pnpm --filter router-cf typecheck` and `pnpm --filter router-cf build`
- [x] 5.3 Run `./init.sh`
