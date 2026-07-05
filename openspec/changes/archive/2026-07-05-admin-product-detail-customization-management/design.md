## Context

`product-owned-customization` made product creation and storefront rendering product-owned, but admin product detail still reads and mutates product data through the browser-local catalog. That leaves a gap: a product created through the backend full-create endpoint is not reliably viewable/editable from detail after reload or across browsers, and product customization cannot be managed after creation.

The desired admin UX follows the Medusa pattern captured in `docs/research/2026-07-04-medusa-admin-product-create-vs-detail-ui-patterns.md`: create is a wizard, while product detail is a two-column, section-based management page where section actions open focused editors. Trophy's customization editor is heavier than a normal detail drawer, so product detail should expose customization as a section and open a full-screen/route editor for editing.

## Goals / Non-Goals

**Goals:**

- Make admin product detail read from `GET /api/admin/products/:id` as the source of truth.
- Keep product list/detail aligned with backend-created products instead of localStorage-only catalog state.
- Redirect create success to `/products/:id` so operators can immediately inspect and continue editing the created product.
- Add a product detail Customization section with status, canvas, layer/form-field counts, readiness issues, and enable/disable/edit actions.
- Add an admin route for full-screen product customization editing launched from the detail section.
- Save product detail changes through section-specific backend routes rather than re-submitting a full-create payload.
- Allow draft products to save incomplete customization, while preventing published products from saving changes that would break Customization Publish Readiness.
- Allow enabling/disabling customization after product creation.

**Non-Goals:**

- No standalone customization template listing, template publish, or revision lifecycle.
- No create-wizard reuse for product detail editing.
- No product-level draft revision workflow for editing a published product in parallel with the live storefront version.
- No automatic resizing, cropping, or normalization of mismatched variant images.
- No shopper-facing background picker separate from selected product variant.
- No long-term preservation of the mock/local product catalog as the product management source of truth.

## Decisions

### Admin product detail uses backend as source of truth

Product detail will load the current product from the admin route surface and map the backend read model into the section UI. Local catalog state can be removed from product detail and list management as the implementation migrates the admin product management surface.

The rejected alternative was to keep localStorage as the detail source after full-create. That fails after reload, conflicts with backend-created product IDs, and hides product-owned customization from the editor.

### Product detail uses section-specific saves

Existing admin product routes already support section-oriented updates for overview, organization, attributes, options, variants, publish, and archive. This change should extend that style for customization rather than reusing `POST /api/admin/products/full-create`.

The rejected alternative was to add a full-update endpoint that accepts the full create payload for existing products. That would increase accidental overwrite risk and blur create consistency with detail maintenance.

### Customization is a detail section with a full-screen editor action

The product detail page will show a Customization section that is readable without entering the editor. Editing opens a full-screen route or route-modal workspace tied to the product ID. The full editor keeps the same product-owned rules as create mode: variant media are preview backgrounds, no independent customization background asset is persisted, and save writes through the product customization endpoint.

The rejected alternative was a Drawer. Drawers match Medusa for small forms, but the existing customization editor needs canvas, panels, inspector, preview state, and background switching. A constrained drawer would make the primary workflow cramped.

### Published products cannot save readiness-breaking customization changes

Draft products may save incomplete customization state. Published products must remain publish-ready after saves that touch variant media or customization. If a save would break readiness, the backend returns a conflict and leaves persisted product data unchanged.

The rejected alternative was to silently move a published product back to Draft. Without a product-level draft revision workflow, that could unexpectedly remove a live storefront product from public browsing after an admin mistake.

### Enabling customization creates a default product customization draft

When customization is enabled on an existing product, the editor starts from the default customization template and derives canvas dimensions from the first available variant image. Draft products can enable customization before all variant media are ready; published products can only save the enable action if the resulting product remains ready.

The rejected alternative was requiring admins to recreate the product to add customization. That contradicts product detail's role as the place to continue managing a product after creation.

### Disabling customization removes the shopper customization behavior

Disabling customization from the detail section removes or disables `product_customizations` for that product. Published products may save this action because the product becomes a normal non-customizable product rather than a broken customizable product.

The rejected alternative was preserving hidden customization while reporting the product as non-customizable. That would make re-enable behavior ambiguous and could leak stale editor state into storefront reads.

## Risks / Trade-offs

- **Backend detail/list migration touches existing mock-first admin surfaces** -> Keep scope to products and do not refactor unrelated admin modules.
- **Published edit validation can surprise operators** -> Return clear conflict errors naming the failed readiness rule and show the same issue in the Customization/Variants sections.
- **Variant replacement can delete media ordering needed by customization previews** -> Preserve stable media order in reads and validate first-media background assumptions in route tests.
- **Full-screen editor route may duplicate create embedded editor wiring** -> Reuse the existing embedded product customization adapter where possible, but keep persistence and routing separate from create.
- **No draft revision workflow means published edits are stricter** -> Document the behavior in progress/handoff and keep future draft revisioning explicitly out of this change.

## Migration Plan

1. Add backend product customization update/read helpers and route-level contract tests.
2. Add admin product client functions for product list/detail and section saves.
3. Move product list/detail reads to backend data and remove product detail dependence on `useCatalog`.
4. Update create success navigation to `/products/:id`.
5. Add Customization section and full-screen editor route.
6. Wire enable/disable/save behavior with readiness errors.
7. Verify backend tests/check/build, admin build, OpenSpec validation, and `./init.sh`.

Rollback is a code rollback during dev mode. No compatibility migration is required unless explicitly requested.

## Open Questions

None.
