## Context

Collections are admin-managed product groupings used by storefront navigation and the `/collections/:handle` route. The backend collection model currently has title, handle, media, and position but no shopper-facing visibility state; admin collection screens therefore cannot hide a collection without deleting it. The admin product list already has a product-name link in the current implementation, so this change treats that behavior as an explicit verified contract.

This change crosses the backend D1 model and collection route surfaces, admin collection workflows, storefront navigation/listing, and admin product-list UI. The repository is in dev mode, so the current schema and contracts should be updated directly rather than maintaining deprecated dual models or compatibility migrations unless the environment requires one.

## Goals / Non-Goals

**Goals:**

- Persist `public`/`hidden` visibility for every collection with `public` as the default.
- Make collection visibility visible and editable in admin create, list, detail, and edit flows.
- Exclude hidden collections from storefront navigation and collection listing/filter data, and return `404` for direct hidden collection routes.
- Keep collection visibility independent of product publication and product visibility.
- Ensure admin product names link to the existing `/products/:id` product detail route.

**Non-Goals:**

- A separate collection lifecycle status, scheduling, permissions, or market-specific visibility.
- Removing products from hidden collections or changing product publication state.
- Changing category visibility or product URL behavior covered by the separate `category-storefront-visibility` change.
- Making an entire admin product-table row clickable.

## Decisions

### One collection visibility field

Add one persisted visibility value with canonical values `public` and `hidden`. The admin UI exposes one Visibility control and does not add a separate Status control because the agreed behavior only answers whether shoppers can see the collection.

### Public by default

New collections and existing rows without an explicit value resolve to `public`, preserving current storefront behavior during rollout.

### Enforce visibility at storefront boundaries

Storefront collection APIs, navigation loaders, collection listing/filter data, and direct collection route resolution exclude hidden collections. Admin APIs continue returning both states. Collection-product relationships and product publication remain unchanged.

### Product navigation uses the existing name link

The admin product list keeps the product name as a link to `/products/:id`, matching the established product-list pattern. Row action menus remain separate, and the row itself is not made clickable to avoid conflicts with edit/delete actions.

## Risks / Trade-offs

- [Risk] Existing D1 environments may lack the visibility field. -> Mitigation: update the current schema and dev database setup/check path; do not add a second collection model.
- [Risk] A hidden collection may still contain product relationships. -> Mitigation: filter only collection presentation and direct collection access; retain relationships and product visibility.
- [Risk] A collection can be hidden while a shopper has an old URL. -> Mitigation: direct route returns a clear `404`, while products remain accessible through their own public routes.
- [Risk] Product list navigation may regress if only menu actions are tested. -> Mitigation: add a UI/route assertion for the product-name link and preserve the menu interaction separately.
