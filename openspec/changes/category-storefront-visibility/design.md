## Context

Admin categories currently expose hardcoded `Active` and `Public` values. The category data model has no shopper-facing visibility state, while storefront category routes, navigation, and product filtering currently treat every category as public. Product cards can also generate category-scoped product URLs, coupling a product detail page to the visibility of the category that supplied the card.

This change crosses the backend D1 model and route surfaces, admin category workflows, and storefront routing. The repository is in dev mode, so the implementation should update the current schema and contract directly rather than preserve deprecated dual models or author compatibility migrations unless the environment requires one.

## Goals / Non-Goals

**Goals:**

- Persist one category visibility state with `public` and `hidden` values, defaulting new and existing categories to `public`.
- Make visibility editable and visible in admin, including for system categories.
- Enforce hidden categories consistently across storefront category navigation, listing/filter data, direct routes, and product-detail category links.
- Make `/product/:productHandle` the canonical product URL and redirect the legacy category-scoped URL.
- Keep product publication and product discovery independent from category visibility.

**Non-Goals:**

- Adding a separate category lifecycle status such as active, archived, or draft.
- Hiding or unpublishing products because one of their categories is hidden.
- Adding category scheduling, permissions, nested visibility rules, or a separate storefront market model.
- Changing collection visibility or product publication rules.

## Decisions

### One visibility field, not status plus visibility

Add a persisted category visibility field with the canonical values `public` and `hidden`. The admin UI uses a single `Visibility` control and removes the non-functional `Status` control. A separate status field was rejected because the agreed behavior only controls shopper-facing display and has no independent lifecycle semantics.

### Public is the default

New categories and existing rows without an explicit value resolve to `public`. This preserves current storefront behavior and avoids silently removing existing catalog navigation during rollout.

### Filter at the storefront route surface

Storefront category reads, category navigation data, category-filtered product queries, and category-scoped product detail resolution must exclude hidden categories. Admin reads retain both public and hidden categories. Product records remain independently published and discoverable through other public categories, collections, or search.

### Canonical product URLs are category-independent

All storefront product cards and product links use `/product/:productHandle`. The existing category-scoped route remains as a compatibility entry point that resolves the product and redirects to the canonical URL; it does not become the canonical link. Product detail breadcrumbs only link to public categories.

### Admin system categories can change visibility

System category protection continues to apply to identity fields and deletion, but visibility is a storefront presentation setting and remains editable for system categories. This keeps system-category identity rules separate from shopper-facing availability.

## Risks / Trade-offs

- [Risk] Existing D1 environments may not have the new column. -> Mitigation: update the current schema and use the repository's dev database setup/check path; do not add a compatibility model.
- [Risk] A hidden category can still be present in a product's category relationship. -> Mitigation: filter category reads and category-derived presentation at the storefront boundary, while leaving product and relationship data intact.
- [Risk] Legacy category-scoped URLs could expose stale category context. -> Mitigation: redirect to the product-only canonical route and have product detail render only public category breadcrumbs.
- [Risk] A product in only hidden categories may still be reachable by its direct product URL. -> Mitigation: keep this behavior explicit: product publication is independent of category visibility, and direct product access remains governed by the existing product publication contract.
