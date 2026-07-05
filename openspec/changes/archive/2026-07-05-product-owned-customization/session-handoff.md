# Product-Owned Customization Session Handoff

## Status

All tasks in `openspec/changes/product-owned-customization/tasks.md` are complete.

## Key Decisions

- Customization belongs to product lifecycle, not a separate template lifecycle.
- Use one-to-one `product_customizations` for enabled state, canvas dimensions, layers, and form fields.
- Do not persist customization background assets; derive backgrounds from ordered variant media.
- Use ordered variant media so the first image for the selected variant is the storefront customization preview background.
- Draft saves can be incomplete; publish requires every created variant to have an image, all variant images to share dimensions, and the editor model to be valid.
- Admin create product embeds the full customization editor without standalone template save/publish/revision controls.
- Storefront shopper customization now lives on `/product/:handle`; legacy storefront template routes were removed.

## Restart Notes

- Read `proposal.md`, `design.md`, `specs/product-owned-customization/spec.md`, and `tasks.md` before implementing.
- This change is ready for archive, not for more implementation.
- `packages/customization/src/types.ts` and `validation.ts` now define the product-owned model and validation helpers.
- `apps/backend/src/db/schema.ts` now has `product_customizations` and `product_variant_media`.
- `apps/backend/src/routes/products.ts` now exposes `POST /api/products/full-create` and returns variant media plus product customization from `readProduct`.
- `apps/backend/src/routes/products.test.ts` plus `apps/backend/vitest.config.ts` provide a backend unit-test harness for the new helper coverage.
- `apps/admin/src/pages/create-product.tsx` now has the customization switch, conditional Customization tab, variant-image gating, and same-dimension guidance.
- `apps/admin/src/pages/create-product.tsx` now loads backend metadata, submits type/collection/category IDs, submits flexible tag values, and calls backend full-create instead of the old mock-only create flow.
- `apps/admin/src/pages/create-product.tsx` now also owns an in-session `embeddedCustomization` draft that survives toggle-off/toggle-on and is omitted from full-create submission when customization is disabled.
- `apps/admin/src/pages/create-product.tsx` now renders the embedded editor directly in the Customization tab using `EditorCanvas`, `LeftPanel`, and `Inspector`.
- `apps/admin/src/hooks/use-embedded-product-customization-editor.ts` is the embedded-mode editor state adapter.
- Embedded background switching is preview-only: selected variant media changes `template.background` for the editor canvas, but only layers/form fields plus canvas dimensions are persisted in the product payload.
- `apps/admin/src/pages/create-product-helpers.test.ts` covers the admin-side verification cases for tab gating, preview switching, and submission omission/inclusion.
- `apps/admin/src/lib/product-metadata-client.ts` and `src/lib/products-client.ts` are the new admin integration points for this flow.
- `apps/backend/src/routes/products.ts` now accepts `organization.tagValues` and resolves or creates tags during full-create.
- `apps/storefront/app/routes/product.$handle.tsx`, `app/components/product/ProductCustomization.tsx`, and `app/lib/product-customization.ts` now implement selected-variant storefront preview behavior.
- Storefront verification coverage lives in `apps/backend/src/lib/storefront-product-customization.test.ts` because backend already owns Vitest in this workspace.
- Verification completed: `pnpm --filter customization test`, `pnpm --filter backend check`, `pnpm --filter backend build`, `pnpm --filter backend test -- --runInBand src/lib/storefront-product-customization.test.ts`, `pnpm --filter admin build`, `pnpm --filter router-cf typecheck`, `pnpm --filter router-cf build`, `openspec validate product-owned-customization --strict`, and `./init.sh`.
