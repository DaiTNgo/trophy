# Backend Route Surface Migration

The backend now separates operator routes from shopper routes. There are no compatibility aliases or redirects for the old management endpoints.

| Old endpoint | New endpoint |
|---|---|
| `/api/products` | `/api/admin/products` |
| `/api/products/:id` | `/api/admin/products/:id` |
| `/api/products/full` | `/api/admin/products/full` |
| `/api/products/:id/full` | `/api/admin/products/:id/full` |
| `/api/products/:id/organize` | `/api/admin/products/:id/organize` |
| `/api/products/:id/attributes` | `/api/admin/products/:id/attributes` |
| `/api/products/:id/media` | `/api/admin/products/:id/media` |
| `/api/products/:id/options` | `/api/admin/products/:id/options` |
| `/api/products/:id/variants` | `/api/admin/products/:id/variants` |
| `/api/products/:id/status` | `/api/admin/products/:id/status` |
| `/api/products/:id/customization` | `/api/admin/products/:id/customization` |
| `/api/products/assets` | `/api/admin/products/assets` |
| `/api/products/assets/:id/content` | `/api/admin/products/assets/:id/content` |
| `/api/product-metadata` | `/api/admin/product-metadata` |
| `/api/product-metadata/types` | `/api/admin/product-metadata/types` |
| `/api/product-metadata/collections` | `/api/admin/product-metadata/collections` |
| `/api/product-metadata/categories` | `/api/admin/product-metadata/categories` |
| `/api/product-metadata/tags` | `/api/admin/product-metadata/tags` |
| `/api/customizations` | `/api/admin/customizations` |
| `/api/customizations/assets` | `/api/admin/customizations/assets` |
| `/api/customizations/assets/:id/content` | `/api/admin/customizations/assets/:id/content` |
| `/api/customizations/assets/:id/preview` | `/api/admin/customizations/assets/:id/preview` |
| `/api/brand-assets/colors` | `/api/admin/brand-assets/colors` for management, `/api/storefront/brand-assets/colors` for runtime reads |
| `/api/brand-assets/fonts` | `/api/admin/brand-assets/fonts` for management, `/api/storefront/brand-assets/fonts` for runtime reads |
| `/api/brand-assets/fonts/upload` | `/api/admin/brand-assets/fonts/upload` |
| `/api/brand-assets/fonts/file/:filename` | `/api/storefront/brand-assets/fonts/file/:filename` |
| `/api/samples` | Removed |

`/api/storefront/products` remains the canonical shopper product listing and detail surface.

`/api/health` remains public and unauthenticated.
