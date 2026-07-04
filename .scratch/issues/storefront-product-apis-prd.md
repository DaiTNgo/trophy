---
title: Storefront Product APIs
labels:
  - ready-for-agent
status: ready-for-agent
---

## Problem Statement

The storefront product listing and product detail pages need to load real product data from the backend instead of mock product arrays. The current backend product APIs are shaped around catalog management and may expose draft or operator-oriented product data, while storefront browsing must be public, shopper-oriented, and limited to products that are available for browsing and buying.

The storefront also needs product search and category filtering. Those behaviors should be part of the Storefront Product Listing rather than separate ad hoc endpoints, so the storefront has one stable public contract for product browsing.

## Solution

Create dedicated public storefront product APIs under `/api/storefront/products`. These APIs are separate from admin catalog APIs and expose only published products. They do not require authentication or credentials.

The storefront listing endpoint returns a compact shopper-facing read model for product grids, search results, and category-filtered browsing. It supports pagination, text search, and category filtering. The storefront detail endpoint loads a published product by handle and returns the richer data needed by the product detail page, including description, attributes, variants, media, options, and product-owned customization data when available.

Search remains a query mode of the listing endpoint. It searches published product browsing fields and does not become a separate search API until storefront search spans non-product content.

## User Stories

1. As a shopper, I want to browse published products on the storefront, so that I can discover products that are available to buy.
2. As a shopper, I want draft products to be hidden from the storefront, so that I never see unfinished catalog records.
3. As a shopper, I want archived products to be hidden from the storefront, so that I only browse active public products.
4. As a shopper, I want a product grid to show each product's title, so that I can identify products quickly.
5. As a shopper, I want a product grid to show each product's subtitle when available, so that I can understand product context before opening details.
6. As a shopper, I want product cards to link by handle, so that storefront URLs are readable and stable.
7. As a shopper, I want product cards to show a thumbnail, so that I can visually compare products.
8. As a shopper, I want products without a thumbnail to render gracefully, so that the listing does not break when an image is unavailable.
9. As a shopper, I want product cards to show the lowest available variant price, so that I can understand the starting price before viewing details.
10. As a shopper, I want products with multiple variant prices to indicate that the price starts from that amount, so that I do not mistake the lowest price for every variant's exact price.
11. As a shopper, I want products with no public numeric price to show a contact action, so that I know I should contact the business for pricing.
12. As a shopper, I want to search storefront products by text, so that I can quickly find relevant products.
13. As a shopper, I want search to match product titles, so that obvious product names are findable.
14. As a shopper, I want search to match product subtitles, so that supporting product terms are findable.
15. As a shopper, I want search to match product handles, so that shared URLs or known slugs can still locate products.
16. As a shopper, I want search to match category names, so that category language helps me find products.
17. As a shopper, I want search results to include only published products, so that search never reveals unfinished products.
18. As a shopper, I want to filter products by category, so that I can browse a category-specific product list.
19. As a shopper, I want category filtering to use stable category handles, so that product category URLs do not break when display names change.
20. As a shopper, I want paginated product results, so that the listing loads predictably as the catalog grows.
21. As a shopper, I want product detail pages to load by product handle, so that product URLs stay readable.
22. As a shopper, I want unpublished product handles to return not found, so that private catalog records are not exposed.
23. As a shopper, I want product detail pages to include description, so that I can understand the product before buying.
24. As a shopper, I want product detail pages to include specs or attributes, so that I can compare product materials, sizes, and production details.
25. As a shopper, I want product detail pages to include variant options, so that I can choose the product variant I want.
26. As a shopper, I want product detail pages to include variant media, so that selected variants can display the right images.
27. As a shopper, I want customizable products to be marked as customizable in listing results, so that I can identify products that support personalization.
28. As a shopper, I want customizable product details to include customization data, so that the storefront can render the customization experience.
29. As a storefront developer, I want a public storefront product API separate from admin catalog APIs, so that public visibility rules are enforced by the backend rather than by caller discipline.
30. As a storefront developer, I want search to be part of the product listing endpoint, so that product grids, category pages, and search pages can share one data contract.
31. As a storefront developer, I want listing responses to avoid full variant and customization payloads, so that product grids stay lightweight.
32. As a storefront developer, I want detail responses to include the richer product payload, so that product detail pages do not need to call admin APIs.
33. As a backend developer, I want storefront product APIs to be public and credential-free, so that they can be cached and are not coupled to admin auth.
34. As a backend developer, I want storefront CORS to allow storefront origins with only public methods, so that the public API has a smaller surface area than admin product routes.
35. As a backend developer, I want contact price to be represented as `priceAmount: null`, so that missing numeric price has a deliberate storefront meaning.
36. As a backend developer, I want thumbnail selection to follow a deterministic fallback order, so that product cards behave consistently.
37. As a backend developer, I want the storefront listing to use the default variant's first image before falling back to other variant media, so that merchandising order is predictable.
38. As an admin, I want newly published products to appear in storefront listing responses, so that publishing controls public visibility.
39. As an admin, I want draft products to remain available in admin catalog APIs but absent from storefront APIs, so that I can prepare products without exposing them.
40. As a future agent, I want the storefront product boundary documented, so that admin and storefront read models are not accidentally merged again.

## Implementation Decisions

- Storefront product browsing uses dedicated public APIs under `/api/storefront/products`.
- Admin catalog APIs remain separate under their existing product namespace and may continue to expose draft, archived, or operator-oriented catalog data.
- Storefront product APIs expose only published products.
- Storefront product APIs are public and do not require auth, cookies, or credentials.
- Storefront CORS should allow storefront origins and only the methods needed for public reads.
- The listing endpoint is `GET /api/storefront/products`.
- The listing endpoint supports `q`, `category`, `page`, and `limit` query parameters.
- The `q` query parameter searches product title, subtitle, handle, and category name.
- Product search stays inside the listing endpoint until storefront search spans non-product result types.
- The `category` query parameter should prefer stable category handles rather than display names.
- The listing response returns `items`, `page`, `limit`, and `total`.
- Each listing item returns `id`, `title`, `subtitle`, `handle`, `priceAmount`, `priceFrom`, `thumbnail`, `category` or `type` summary data, and `customizable`.
- Listing items do not return full variants, layers, form fields, or full customization payloads.
- Listing `priceAmount` is the lowest non-null variant price.
- Listing `priceFrom` is true when there are multiple variants or multiple public prices that make the displayed price a starting price.
- Listing `priceAmount: null` is a Contact Price state. The storefront should show a contact action instead of treating it as an error.
- Listing thumbnails use the first media item of the default variant.
- If the default variant has no media, listing thumbnails fall back to the first media item of the first variant with media.
- If no variant media exists, listing thumbnail is `null` and the storefront should render a placeholder.
- The detail endpoint is `GET /api/storefront/products/:handle`.
- The detail endpoint looks up products by handle, not numeric id.
- The detail endpoint returns `404` for missing products and for products that are not published.
- The detail response includes the listing fields plus description, attributes/specs, options, variants, variant option values, variant media, and product-owned customization data when available.
- Product-owned customization in the detail response follows the existing product-owned customization model and must not reintroduce standalone template or revision lifecycle concepts.
- The implementation respects the Storefront Product API Boundary ADR.
- The implementation uses Storefront Product Listing, Storefront Product Search, Admin Product Catalog, and Contact Price terminology from the domain glossary.

## Testing Decisions

- Tests should assert public API behavior at the highest practical seam: HTTP-level backend route behavior for storefront listing and detail endpoints.
- Backend route tests should verify that listing returns only published products.
- Backend route tests should verify that draft and archived products are excluded even when they match search or category filters.
- Backend route tests should verify pagination shape and total counts.
- Backend route tests should verify search matches title, subtitle, handle, and category name.
- Backend route tests should verify category filtering by category handle.
- Backend route tests should verify lowest-price selection and `priceFrom` behavior.
- Backend route tests should verify `priceAmount: null` for Contact Price products.
- Backend route tests should verify thumbnail fallback from default variant media to first variant media, and `null` when no media exists.
- Backend route tests should verify detail lookup by handle.
- Backend route tests should verify detail returns `404` for unpublished products.
- Backend route tests should verify detail includes variants, media, options, attributes, and customization summary when present.
- Storefront integration can be verified through route loaders after the backend API exists, but the first implementation seam should be the backend public API because it owns visibility, filtering, and read model shape.
- Existing backend product route tests are prior art for API-level coverage and should be extended or mirrored for the storefront product route.
- Existing storefront route loaders that currently use mock product data are the integration seam for replacing frontend mocks with backend calls.
- Verification should include backend check/build, backend route tests, storefront typecheck/build if frontend loaders are wired, and the root init script before marking the feature complete.

## Out of Scope

- Admin product catalog redesign.
- Admin product create or edit submission changes.
- Product publishing workflow changes beyond relying on existing `published` status.
- Full-text search ranking, typo tolerance, suggestions, or recent searches.
- A separate cross-content storefront search endpoint.
- Searching articles, pages, categories as standalone results, or non-product content.
- Sorting beyond the default backend ordering unless the storefront UI explicitly requires it.
- Faceted filtering beyond category, search text, page, and limit.
- Shopper authentication, personalized pricing, or customer-specific catalog visibility.
- Cart, checkout, order, or payment APIs.
- Image transformation, resizing, or CDN processing.
- Maintaining deprecated compatibility paths for any old mock product contract once the storefront uses the new API.

## Further Notes

The testing seam decision for this PRD is backend HTTP route behavior first, with storefront route loaders as the integration seam once the public API exists. This matches the current architecture because the backend owns product visibility, product media relationships, category filtering, product-owned customization data, and the Contact Price read model.

This PRD was synthesized from the grill-with-docs session on storefront product APIs. The domain glossary was updated with Storefront Product Listing, Storefront Product Search, Admin Product Catalog, and Contact Price. ADR `0002-storefront-product-api-boundary` records the decision to separate storefront public product APIs from admin catalog APIs.

The issue tracker is not configured for this repo, and prior PRD publication in this workspace uses local markdown issues. This PRD is therefore published as a local markdown issue with the `ready-for-agent` label.
