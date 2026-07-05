## Context

The system currently handles media asset retrieval (Products, Customizations, Brand Assets) by mounting `GET /content` routes within domain-specific routers: `/api/admin/*` and `/api/storefront/*`. 

This leads to several architectural issues:
1. **Redundancy:** Code to stream assets from the R2 bucket is duplicated.
2. **Frontend Complexity:** The Admin UI must fetch images using `backendFetch` (attaching Bearer tokens) and convert them to `Blob` URLs to display them, bypassing standard `<img>` behavior.
3. **Redundant Authentication:** Assets are identified by unguessable 128-bit UUIDv4 IDs. These IDs natively function as "capability URLs". Enforcing authentication for `GET` requests adds no practical security but creates immense friction for public sharing and CDN caching.

## Goals / Non-Goals

**Goals:**
- Unify all asset GET routes into a single top-level `/api/assets/*` router.
- Remove authentication requirements for `GET /api/assets/*` routes to leverage capability URLs.
- Simplify frontend code by allowing standard `<img src="..."/>` tags for all asset viewing.
- Prepare the architecture for easy CDN integration (e.g., Cloudflare Cache rules).

**Non-Goals:**
- Modifying the `POST` / Upload routes. These must remain authenticated and scoped to `/api/admin/*` and `/api/storefront/*`.
- Changing how `ownerKey` is validated during Customization upload.

## Decisions

1. **Top-Level Public Router (`/api/assets/*`)**
   We will create a new top-level router `apps/backend/src/routes/assets/index.ts`. It will handle all `GET` requests for `products`, `customizations`, and `brands`. This route will not use the `requireAdminSession` middleware.
   
   *Rationale:* This consolidates the logic and makes it clear that asset viewing is distinct from asset management (upload/delete). Capability URLs (UUIDs) provide sufficient access control.

2. **Frontend Admin Media Component Refactor**
   The `<AdminMedia>` component will be reverted back to using the standard `<img>` `src` attribute for all non-PDF media, rather than fetching a Blob. 

   *Rationale:* Without auth requirements, the browser can natively fetch and cache images.

## Risks / Trade-offs

- **Risk:** Sensitive customizations might be exposed if a user shares their specific UUID link.
  → **Mitigation:** The UUID is unguessable. Educate users that the link is effectively a private capability token.
- **Risk:** Existing database serializers output `/api/admin/products/assets...`.
  → **Mitigation:** Ensure all database serializers and formatters in both Admin and Storefront routes are updated to output the new `/api/assets/...` paths.
