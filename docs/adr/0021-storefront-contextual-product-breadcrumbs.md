# Storefront Contextual Product Breadcrumbs

Storefront Product Detail Pages (PDP) use a contextual breadcrumb model that dynamically reflects the shopper's active browsing journey across many-to-many Product Categories (*Shop by Product*) and Product Collections (*Shop by Interest*). When a shopper clicks into a product from a specific category or collection listing, lightweight query parameters (`?category=<handle>` or `?collection=<handle>`) pass this browsing context directly to the PDP.

The storefront resolver extracts these parameters during Cloudflare Worker SSR execution and resolves the crumb title using taxonomy data already loaded by the storefront root layout (`categories` and `collections`). When both parameters are present, `collection` takes precedence to reflect specific occasion- or intent-driven browsing. When accessed directly (e.g. search engine link, direct URL, or bookmark without query parameters), the breadcrumb falls back to the product's Primary Category (`product.categories[0]`), or to the generic catalog (`/products`) when no category exists.

This approach is handled entirely within the storefront application without requiring round-trip backend verification or changes to backend product detail responses. Canonical SEO tags on PDP remain fixed to `/product/:handle`, preventing duplicate indexing while preserving a natural return path for shoppers.

## Considered Options

- Fixed Canonical Category Only. Rejected because products in Trophy link to multiple categories and collections; forcing a static breadcrumb disorients shoppers who entered through an occasion collection (e.g. Golf Tournament Awards) by routing them back to a generic physical category (e.g. Metal Cups).
- Nested Path URLs (`/categories/:cat/products/:prod` and `/collections/:col/products/:prod`). Rejected because nested URLs introduce route proliferation, complex redirect rules, and duplicate content risks that were already unified to `/product/:handle`.
- Client-only Navigation State (`location.state`). Rejected because in a Cloudflare Worker SSR architecture, `location.state` cannot be read during initial server rendering, resulting in layout shift, hydration mismatches, and broken breadcrumbs upon page reload or opening links in new tabs.
- Backend-verified collections query on PDP. Rejected because adding extra join queries or round-trip validation adds backend overhead for a purely presentation-level navigation aid that the storefront can resolve with its cached layout taxonomy data.
