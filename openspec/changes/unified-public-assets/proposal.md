## Why

Currently, asset retrieval routes (for products, customizations, and brand assets) are duplicated across `/api/admin/*` and `/api/storefront/*`. Admin routes enforce authentication, which forces the Admin frontend to awkwardly fetch images via JS blobs (`backendFetch`) to pass Bearer tokens. However, because all assets use unguessable 128-bit UUIDs for their IDs, the URLs act as capability URLs. Authentication on `GET` requests for these specific assets is redundant and hinders both developer experience and content delivery performance. Moving all asset fetching to a unified public route solves these issues while maintaining security by obscurity for UUIDs.

## What Changes

- Move all asset GET routes (`product-assets`, `customization-assets`, `brand-assets`) to a unified public top-level router `/api/assets/*`.
- Remove GET `/content` and `/preview` endpoints from `/api/admin/*` and `/api/storefront/*`.
- Keep POST/upload routes in their respective domains (`/api/admin/*` and `/api/storefront/*`) with authentication.
- Update `AdminMedia` component to use standard `<img src="...">` pointing to `/api/assets/*` instead of generating Blob URLs.
- Update database serialization logic to output `contentUrl: /api/assets/...`.

## Capabilities

### New Capabilities

- `unified-assets`: A top-level API structure to serve all uploaded media assets (Products, Brands, Customizations) via public Capability URLs.

### Modified Capabilities

- None

## Impact

- **Backend Routing**: Impacts `adminRoute` and `storefrontRoute` by removing GET endpoints, introduces `assetsRoute`.
- **Frontend Admin**: `AdminMedia` and `product-assets-client.ts` will be simplified.
- **Storefront**: Image tags will point to `/api/assets/*`.
- **Database/Serializers**: Any API response including `contentUrl` for assets will change format.
