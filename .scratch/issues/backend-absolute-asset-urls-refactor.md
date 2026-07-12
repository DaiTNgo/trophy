---
title: Backend Absolute Asset URLs Refactor
labels:
  - refactor
  - ready-for-agent
status: ready-for-agent
---

## Problem Statement

Admin and storefront currently receive backend-owned image and asset URLs as relative paths such as `/api/assets/...`. That forces each frontend surface to remember to normalize asset URLs with its own backend base URL before rendering images, previews, thumbnails, uploaded customization assets, clipart, cart thumbnails, or order preview backgrounds.

From the developer's perspective, this spreads backend URL knowledge into multiple clients and shared UI call sites. The same backend-local URL can render correctly in one screen but break in another if a caller forgets to normalize it. It also makes shared customization UI less portable because consumers must pass URL resolver callbacks for data that could already be complete at the API boundary.

## Solution

Move backend-local asset URL completion into the backend response layer. Backend APIs should return absolute URLs for image and asset fields that point back to backend-served assets. The absolute URL should use the backend request origin as the base, so local development returns the local backend origin and deployed Workers return their public backend origin without requiring a new environment binding.

Clients should keep lightweight backward-compatible guards for existing absolute URLs, `blob:` URLs, `data:` URLs, and any old relative data stored in local state or snapshots, but new API responses should not require admin or storefront screens to prepend the backend URL.

## Commits

1. Add a backend helper for asset URL serialization.

   Create a small shared backend helper that accepts the current request context and a backend-local asset path. It returns `null` unchanged, leaves already absolute HTTP(S) URLs unchanged, leaves non-backend local schemes alone when appropriate, and converts backend-local paths into absolute URLs using the current request origin.

   Add focused unit tests for the helper before using it broadly. Cover paths with and without a leading slash, already absolute HTTP and HTTPS URLs, empty or null values, and a representative backend-local asset path.

2. Use the helper in direct product asset upload responses.

   Update admin product asset upload responses so uploaded product media returns an absolute `contentUrl`. Keep the response shape the same except for URL value format.

   Update route-level tests to assert the response URL includes the backend origin from the request.

3. Use the helper in direct customization asset upload responses.

   Update admin and storefront customization upload responses so uploaded customization assets return absolute `contentUrl` and absolute `previewUrl` when a preview exists.

   Update route-level tests for successful upload responses, including PDF preview cases where relevant.

4. Serialize clipart preview URLs as absolute URLs at response time.

   Keep persisted clipart rows compatible with existing data, but convert `previewUrl` to an absolute URL when returning clipart assets from category listing, batch upload, update, and soft-delete responses.

   Update clipart route tests so both existing relative rows and newly uploaded rows are returned as absolute preview URLs.

5. Return absolute product media URLs from admin product read models.

   Update admin product detail/list read models that expose variant media so each media `contentUrl` is absolute. Keep asset IDs, file names, dimensions, byte sizes, and positions unchanged.

   Update admin product contract tests around product media response shapes.

6. Return absolute product thumbnails and media URLs from storefront product APIs.

   Update storefront listing items, collection product listing items, and product detail variant media so `thumbnail` and media `contentUrl` values are absolute when present.

   Update storefront product API tests for default-thumbnail selection, fallback-thumbnail selection, and detail media serialization.

7. Return absolute URLs in storefront cart and order response models.

   Update cart resolve responses, order creation snapshots, order lookup responses, and customization background snapshots so product thumbnails and preview backgrounds use absolute backend URLs.

   Update route tests for cart resolve, order creation, and order lookup to assert observable response payloads, not the helper implementation.

8. Return absolute URLs for storefront category and collection image fields when they are backend-local.

   Normalize category and collection `imageUrl` fields at response time when the stored value is a backend-local path. Leave external HTTP(S) image URLs unchanged.

   Update storefront category and collection API tests to cover null, external URL, and backend-local image path behavior.

9. Simplify storefront client URL normalization without removing compatibility.

   Stop treating normal API responses as relative by default in the storefront client. Keep a narrow compatibility function for legacy local cart snapshots, older order snapshots, and any manually stored relative category or collection image path.

   Update storefront client tests so product API mappings preserve already absolute URLs and only normalize legacy relative values.

10. Simplify admin client URL normalization without removing compatibility.

   Remove redundant normalization at call sites that consume new backend API responses. Keep shared media preview and admin media components tolerant of relative, absolute, `blob:`, and `data:` URLs because they can still receive local uploads or older persisted values.

   Update admin tests around media preview behavior and product asset upload mapping to ensure absolute backend URLs are accepted unchanged.

11. Reduce shared customization resolver requirements.

   Make shared customization UI work correctly when asset URLs are already absolute. Keep resolver props available as compatibility hooks for caller-owned local values and historical snapshots, but do not require the admin or storefront to pass a backend URL resolver for normal API-loaded assets.

   Verify the shared package type check still passes and add or adjust tests only where existing coverage directly asserts resolver behavior.

12. Run focused verification for changed contracts.

   Run backend route tests that cover product assets, customization assets, clipart, product APIs, cart/order APIs, category APIs, and collection APIs.

   Run admin tests for media helpers where touched, the admin build, storefront typecheck, storefront build, and the shared customization React package check.

13. Run the full repository restartability check.

   Run the repository initialization script after focused checks pass. Record the exact verification commands and results in the repo progress state.

14. Clean up stale frontend normalization references.

   Search the admin, storefront, and shared customization surfaces for old URL-normalization helpers. Remove helpers that are no longer used. Keep only compatibility helpers with clear names that describe legacy/local value handling.

   Run one final targeted search for backend-local `/api/assets/` URL concatenation in frontend code to confirm new API-loaded assets no longer depend on frontend base URL concatenation.

## Decision Document

- Backend response serialization owns backend-local asset URL completion.
- The backend request origin is the default base for generated absolute URLs.
- No new public backend URL binding is required for the initial refactor.
- Persisted database values do not need to be migrated from relative to absolute URLs.
- Existing HTTP(S) image URLs remain unchanged.
- Client code remains tolerant of `blob:` and `data:` URLs for local previews.
- Admin and storefront may keep narrow legacy compatibility normalizers, but normal API-loaded image fields should already be renderable.
- Product media, customization uploads, clipart previews, storefront thumbnails, cart/order thumbnails, order customization backgrounds, category images, and collection images are in scope.
- Font URLs are out of the first pass unless they are already carried as image/asset preview fields, because font serving has separate endpoint semantics.
- This refactor changes response value format but not route names, object ownership, asset authorization, cache headers, upload behavior, or storage keys.
- Existing public asset routes remain the serving surface for returned URLs.

## Testing Decisions

- Good tests should assert the external API behavior: image-related fields returned by backend routes are absolute URLs and can be used directly by clients.
- Tests should not assert that a specific helper function was called.
- Backend route-surface tests are required for changed admin and storefront API contracts.
- Helper unit tests are useful for URL edge cases because the helper will be reused by many serializers.
- Storefront client tests should verify compatibility only where the client still receives legacy local or relative values.
- Admin media tests should verify absolute URLs continue to work and local preview schemes remain untouched.
- Prior art exists in backend product, clipart, order, collection, and storefront product route tests, plus admin media helper tests and storefront cart/API mapping tests.

## Out of Scope

- Changing how assets are stored in R2.
- Migrating existing database rows from relative URLs to absolute URLs.
- Replacing backend asset routes with signed R2 URLs or direct public bucket URLs.
- Changing asset authentication, ownership, CORS, or cache policy.
- Reworking product metadata image upload UX.
- Changing font asset URL contracts unless they are later found to share the same image rendering issue.
- Removing all frontend compatibility handling in one pass.

## Further Notes

Options considered:

- Frontend-only normalization: rejected as the long-term direction because it preserves duplicated backend URL knowledge in admin, storefront, and shared UI.
- New public backend URL binding: not chosen initially because the current code can derive the correct backend origin from the request and the repo instructions ask to avoid ambiguous binding changes without user confirmation.
- Persisting absolute URLs in the database: not chosen because it couples stored data to one deployment origin and makes local, preview, and production environments harder to move.
