## Context

Admin product detail is the source of truth for managing a product after creation. The current Trophy UI groups variants and pricing in one section, but its edit actions are weaker than create product: options are edited through comma-separated inputs, variants are edited through stacked cards, and important Trophy fields are not consistently exposed.

The current backend route surface also includes broad replacement endpoints for options and variants. Those endpoints are risky for routine product-detail edits because small admin actions can overwrite unrelated variant state such as SKU, price, stock, media, or option selections.

The desired behavior is Medusa-like product management: product detail is section-based, create uses a wizard, and edit actions use side windows or bulk editors. This change follows Medusa's UX behavior while preserving Trophy's product model.

## Goals / Non-Goals

**Goals:**

- Make product detail variants/pricing management feel like Medusa Admin: section menus, side windows, row actions, and bulk editors.
- Display and edit Trophy product fields only: option definitions/values, variant title, option selections, SKU, price, inventory, allow backorder, and variant media.
- Prevent the new admin product detail UI from using full-replace options or variants APIs for routine edit actions.
- Add operation-specific backend routes and tests for option, variant detail, price, stock, and media changes.
- Preserve Trophy variant media as customization-relevant data.

**Non-Goals:**

- Do not copy Medusa's product data model fields such as EAN, UPC, barcode, dimensions, region price matrices, tax-inclusive flags, inventory locations, or inventory kits.
- Do not add migrations unless implementation discovers the current schema cannot represent an agreed Trophy field.
- Do not change storefront product APIs.
- Do not replace the create product flow; only align product detail edit behavior with the Medusa-like management model.

## Decisions

### Use Medusa-like split management instead of one combined wizard

Product detail will expose separate management actions for options, variants, prices, stock, and media. This mirrors Medusa's behavior after creation: options define variation axes, variants are purchasable rows, and prices/stock are operational bulk-edit data.

Alternative considered: one combined create-like editor for options and variants. That would reduce navigation, but it encourages destructive regeneration and does not match Medusa's product-detail behavior.

### Treat variant edits as operation-specific actions

The admin product detail UI MUST call operation-specific backend routes for routine edits:

- Add, update, delete product options.
- Add, update, delete option values.
- Create, update, delete variants.
- Bulk update prices.
- Bulk update stock.
- Update variant media.

The UI MUST NOT call broad full-replace options or variants routes for these routine actions. Existing full-replace routes may remain temporarily for legacy flows or create-flow internals, but they are not the product-detail edit contract.

Alternative considered: keep the current `PUT /options` and `PUT /variants` contracts and make the UI careful. That keeps backend scope smaller, but it leaves the main failure mode in place: small edits can replace unrelated state.

### Keep Trophy product fields as the visible contract

The UI will show fields already present in Trophy's product model:

- Option definition title and option values.
- Variant title and option selections.
- SKU.
- Single price amount.
- Inventory quantity.
- Allow backorder.
- Variant media.

Medusa-only fields are excluded unless the Trophy product model later adds them.

### Manage media with Trophy semantics

Variant media remains attached to variants because it is part of Trophy's customization background behavior. The interaction can be Medusa-like, but the data model should not be changed to Medusa's product-media-first association model in this change.

## Risks / Trade-offs

- Full Medusa-like UX is larger than a simple drawer refactor. -> Keep scope bounded to fields in the Trophy product model and avoid Medusa-only data.
- More backend routes increase surface area. -> Add route-level API contract tests for success and important failure modes.
- Existing full-replace routes may still exist. -> Document that the new admin product detail UI does not use them, and isolate new client methods by operation intent.
- Option/value deletes can invalidate existing variants. -> Backend MUST reject destructive deletes when a value is still used by a variant, unless a future explicit destructive flow is designed.
- Bulk editors can accidentally overwrite stale rows. -> Payloads MUST identify specific rows and fields, and responses MUST return the refreshed product or affected rows.

## Migration Plan

1. Add operation-specific backend routes alongside the existing full-replace routes.
2. Add API contract tests for the new route surface.
3. Add admin client methods for the new operations.
4. Replace product detail variants/pricing UI actions to use the new client methods.
5. Keep create product behavior unchanged.
6. After product detail no longer depends on full-replace routes, consider removing or narrowing legacy full-replace routes in a later cleanup if no callers remain.

Rollback is to switch product detail actions back to the old client methods, but that restores full-replace risk and should be treated as temporary.

## Open Questions

- Should variant media bulk association be supported in this change, or only per-variant media management?
- Should the variants table use simple `Table` first or `DataTable` immediately for search/filter/sort parity?
