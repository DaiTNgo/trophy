# Medusa Admin Product Variants/Pricing Edit UI Gap

## Problem
The current product detail edit surface in `apps/admin` does not match Medusa Admin’s edit/update pattern for variants and pricing. The create flow is a FocusModal wizard with a row-based variants step, while the edit flow is a pair of Drawers plus ad-hoc cards and missing fields that exist during create. The repo already keeps research notes under `docs/research/`, so this note follows the existing dated-note convention. Sources: [docs/research/2026-07-04-medusa-admin-product-create-vs-detail-ui-patterns.md](/Users/dnt/workspace/trophy/docs/research/2026-07-04-medusa-admin-product-create-vs-detail-ui-patterns.md), [Create Product page](/Users/dnt/workspace/trophy/apps/admin/src/pages/create-product.tsx), [Product detail page](/Users/dnt/workspace/trophy/apps/admin/src/pages/product-detail.tsx).

## Repo Findings
- The product detail page is sectioned into Overview, Thumbnail, Variants, Attributes, Customization, and a side column for publish/organize actions. That means the variants/pricing surface is already isolated as one editable section. Source: [apps/admin/src/pages/product-detail.tsx](/Users/dnt/workspace/trophy/apps/admin/src/pages/product-detail.tsx) (lines 14-106).
- The create flow is a `FocusModal` with `ProgressTabs` for Details, Organize, Variants, and optional Customization, which is closer to Medusa’s creation UX. Source: [apps/admin/src/pages/create-product.tsx](/Users/dnt/workspace/trophy/apps/admin/src/pages/create-product.tsx) (lines 14-181).
- The create variants step is table-based and exposes `title`, `SKU`, media upload, `allowBackorder`, `price`, and `inventory quantity`, with column toggles in a Medusa-like bulk-edit layout. Source: [apps/admin/src/pages/create-product/create-product-variants.tsx](/Users/dnt/workspace/trophy/apps/admin/src/pages/create-product/create-product-variants.tsx) (lines 22-368).
- The create details step also includes attribute rows, a customization toggle, and richer product option management with chip-style option values. Source: [apps/admin/src/pages/create-product/create-product-details.tsx](/Users/dnt/workspace/trophy/apps/admin/src/pages/create-product/create-product-details.tsx) (lines 22-323).
- The current edit UI uses two Drawers: one for options and one for variants. The variants drawer only edits `priceAmount`, `sku`, and media, then shows a read-only variant list below. It does not expose backorder, inventory quantity, or the table/bulk-editor structure used in create. Source: [apps/admin/src/pages/product-detail/product-detail-variants.tsx](/Users/dnt/workspace/trophy/apps/admin/src/pages/product-detail/product-detail-variants.tsx) (lines 24-379).

## Medusa UI Guidance
- Medusa Admin docs explicitly separate create forms and edit/update forms: create uses `FocusModal`, edit/update uses `Drawer`. Source: [Forms - Admin Components](https://docs.medusajs.com/resources/admin-components/components/forms).
- `FocusModal` is the modal dialog pattern for creation flows; `Drawer` is the sliding panel pattern for edits. Source: [Focus Modal](https://docs.medusajs.com/ui/components/focus-modal), [Drawer](https://docs.medusajs.com/ui/components/drawer).
- For structured row editing, Medusa UI provides `Table`, and `DataTable` is the recommended table component for Medusa Admin customizations when filtering, sorting, searching, or bulk actions matter. Source: [Table](https://docs.medusajs.com/ui/components/table), [Data Table](https://docs.medusajs.com/ui/components/data-table).
- For money fields, Medusa UI provides `CurrencyInput`, which is the first-party primitive for price entry. Source: [Currency Input](https://docs.medusajs.com/ui/components/currency-input).
- For choice fields, Medusa UI provides `Select`. For consistent shell and status affordances, `Button`, `Heading`, `Text`, `Badge`, and `StatusBadge` are the standard primitives already used across Medusa UI docs and in this app. Sources: [Select](https://docs.medusajs.com/ui/components/select), [Button](https://docs.medusajs.com/ui/components/button), [Heading](https://docs.medusajs.com/ui/components/heading), [Text](https://docs.medusajs.com/ui/components/text), [Badge](https://docs.medusajs.com/ui/components/badge), [Status Badge](https://docs.medusajs.com/ui/components/status-badge).
- Medusa’s own product edit docs say options are managed in a side window, variants are editable from the product details page, variant prices are edited through a bulk editor, and variant inventory/stock levels are also edited through a bulk editor. Sources: [Edit Product in Medusa Admin](https://docs.medusajs.com/user-guide/products/edit), [Manage Product Variants in Medusa Admin](https://docs.medusajs.com/user-guide/products/variants), [Bulk Editor in Medusa Admin](https://docs.medusajs.com/user-guide/tips/bulk-editor).
- Medusa’s admin widget zones also expose `product.details.*` and `product_variant.details.*`, so custom product-specific or variant-specific sections can live inside the native product page without replacing the whole page. Sources: [Product Module's Admin Widget Injection Zones](https://docs.medusajs.com/resources/commerce-modules/product/admin-widget-zones), [Admin Widget Injection Zones](https://docs.medusajs.com/resources/admin-widget-injection-zones).

## Recommendation
1. **Rank 1: Drawer + Table/CurrencyInput for variant edit.** This matches Medusa’s edit/update convention, keeps the existing detail page architecture, and gives the missing edit fields a Medusa-like row editor. Trade-off: more refactor than the current card UI, but still localized to `apps/admin`. Adoption risk: low, because `Drawer`, `Table`, and `CurrencyInput` are first-party primitives and already fit the repo’s UI stack.
2. **Rank 2: Drawer + DataTable if the variant set must support heavier bulk operations.** This is the closest fit for Medusa’s bulk-edit behavior. Trade-off: more setup and more opinionated than `Table`, so it is better only if filtering/sorting/searching or spreadsheet-like bulk edits are needed. Adoption risk: low to moderate because it adds more moving parts than a simple table.
3. **Rank 3: Keep the current stacked-card variant drawer.** Fastest to retain, but it stays visually and behaviorally far from Medusa Admin and leaves the create/edit mismatch in place. Adoption risk: high from a UX standpoint because it preserves the current gap.

## Implementation Implications
- If the goal is “looks and feels like Medusa UI,” the edit variants surface should become a row-based editor, not a card list.
- The missing fields to consider adding are the ones already present in create: backorder, inventory quantity, and a clearer media/price row layout.
- If pricing is single-currency here, `CurrencyInput` is the best first-party primitive. If this app needs region/currency-specific pricing parity with Medusa Admin, the bulk-editor pattern from Medusa docs is the better fit.
- If option editing stays in this section, it should move closer to Medusa’s side-window option management instead of a comma-separated text field.

## Open Questions
- Is pricing single-currency in this app, or do we need Medusa-style currency/region price columns?
- Should inventory/backorder editing be part of this section, or stay separate?
- Should options be edited in the same drawer as pricing, or in a separate options drawer/section?
- Do we want strict Medusa parity, or only Medusa UI primitives with our own interaction model?

