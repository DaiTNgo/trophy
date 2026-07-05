## Why

The storefront Navbar still hardcodes category names, Material Symbols icons, and mock-only navigation items (VẬT LIỆU, DOANH NGHIỆP, THỂ THAO, LINH KIỆN). The "CHỦ ĐỀ" (Themes) dropdown has no content at all. The Navbar should render dynamically from the same backend data that powers the rest of the storefront, using real images from the database instead of generic icons.

## What Changes

- **SẢN PHẨM mega menu**: Fetch categories from `GET /api/storefront/categories`, render grid with `image_url`, link to `/products?category=<handle>`
- **CHỦ ĐỀ mega menu**: New `GET /api/storefront/collections` endpoint + fetch and render same grid layout, link to `/collections/<handle>` page
- **Bottom row**: Dynamic from categories API, no hardcoded items
- **Remove**: All hardcoded category arrays and fake navigation items (VẬT LIỆU, DOANH NGHIỆP, THỂ THAO, LINH KIỆN, SẢN PHẨM MỚI)
- **New page**: `/collections/<handle>` route showing products in that collection
- **Data flow**: Root loader fetches categories + collections, passes to Navbar via `useRouteLoaderData`

## Capabilities

### New Capabilities

- `storefront-collections-list`: New public backend endpoint `GET /api/storefront/collections` returning all collections with id, title, handle, description, imageUrl
- `storefront-collection-page`: New storefront route `/collections/:handle` showing products in that collection via existing `GET /api/storefront/collections/:handle/products`
- `storefront-dynamic-navbar`: Root loader fetches categories + collections; Navbar renders both mega menus dynamically with real images

### Modified Capabilities

- (none — no existing capability specs are changing)

## Impact

- **Backend**: Add `GET /api/storefront/collections` list endpoint (new file or extend `collections.ts`)
- **Storefront**: Rewrite `Navbar.tsx` entirely, add root loader to `root.tsx`, add new route `/collections/:handle`, add `fetchStorefrontCollections()` to `api.ts`
- **No changes** to admin app, customization package, or product listing/detail APIs
