## Context

Storefront already has `GET /api/storefront/products`, `GET /api/storefront/categories`, and `GET /api/storefront/collections/:handle/products` backed by Drizzle ORM + D1. The Navbar is a presentational component rendered in `root.tsx` with no loader — it currently hardcodes 10 category-like items with Material Symbol icons.

Two new concerns: (1) collections currently only expose a products-by-collection endpoint, no collections list; (2) the Navbar has no data-aware mechanism to fetch and render categories/collections with real images.

## Goals / Non-Goals

**Goals:**

- Add `GET /api/storefront/collections` returning all collections ordered by `position`.
- Add root loader in `root.tsx` that fetches categories + collections in parallel.
- Rewrite `Navbar.tsx` to accept data props and render both mega menus in a grid layout with `image_url`.
- Remove all hardcoded category lists, icons, and fake nav items.
- Add storefront route `GET /collections/:handle` rendering collection products via existing `GET /api/storefront/collections/:handle/products`.
- Add tests for the new collections list endpoint and for Navbar category/collection data loading.

**Non-Goals:**

- Changing the existing product listing/detail APIs or auth.
- Adding image resizing or CDN processing.
- Changing the admin app or customization package.
- Adding mobile-specific Navbar layouts beyond what exists.

## Decisions

### Root loader over client-side fetch

The Navbar data (categories + collections) is fetched once at the root loader level and passed via `useRouteLoaderData`. This avoids a flash-of-empty-content and keeps the Navbar SSR-rendered. The cost is one extra parallel query on every page navigation, but both endpoints are simple indexed reads against D1.

Alternative considered: `useEffect` + fetch in the Navbar component. Rejected because it adds a client-side round-trip and renders an empty Navbar on first paint.

### Collections list endpoint in existing file

Add `GET /` to `storefront/collections.ts` rather than a new file. The file already exists and handles the `/:handle/products` sub-route; adding a top-level list there keeps collection logic in one place.

Alternative considered: separate `collections-list.ts`. While cleaner separation, the module is small enough that split files add ceremony without benefit.

### Same grid layout for categories and collections

Both mega menus share a single grid component (e.g., `MegaMenuGrid`) that accepts an items array of `{ title, imageUrl, href }`. Categories link to `/products?category=<handle>`, collections link to `/collections/<handle>`. This keeps the presentation DRY while the data source differs.

### Collections route at `/collections/:handle`

Reuses the existing `fetchStorefrontCollectionProducts()` API call. The route page mirrors the products listing page (`/products`) layout: breadcrumbs, product grid with pagination.

Alternative considered: using `/products?collection=<handle>`. This conflates two different browsing intents; a dedicated collections namespace is cleaner and matches the Navbar structure.

## Risks / Trade-offs

- **D1 query per navigation**: Root loader adds two D1 queries (categories + collections list) to every page load. Both are small indexed reads against cached data; expected to be <5ms each. If this becomes an issue, add a Cloudflare Cache API wrapper at the route level.
- **No icon field**: The old Navbar used Material Symbol icons for visual identity. Replacing with `image_url` may look inconsistent if some categories/collections lack images. Mitigation: render a styled placeholder in the grid when `image_url` is null.
- **Bottom row categories only**: The bottom row currently shows 7 categories (a subset). We show all categories from the API. If there are many categories, the row may wrap. Mitigation: horizontal scroll (contained overflow-x-auto) already present in the existing bottom row.
- **`GET /api/storefront/collections` does not exist yet**: First-time API addition means old storedfront clients (if any) have no fallback. Mitigation: soft launch — the Navbar simply won't show a CHỦ ĐỀ dropdown until the endpoint is deployed.
