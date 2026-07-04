# Storefront Product API Boundary

Storefront product browsing uses dedicated public read APIs under `/api/storefront/products` instead of reusing the admin catalog endpoints under `/api/products`. Storefront APIs expose only published products and return shopper-oriented list/detail models, while admin catalog APIs remain free to include draft or archived records and operator-oriented management fields.

**Considered Options**

- Reuse `/api/products` with status filters: rejected because it makes public visibility depend on every caller choosing the correct filter.
- Split storefront and admin endpoints: accepted because the boundary makes visibility and response shape explicit.
