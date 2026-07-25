# Progress

## Current State

- Proposal, design, capability spec, and implementation tasks are complete.
- Backend, admin, and storefront contracts now carry independent Gallery Media and per-variant Customization Media.
- Admin Create Product and Product Detail expose separate upload/replace actions; storefront canvas selection uses Customization Media and gallery fallback is display-only.
- OpenSpec strict validation passes.

## Decisions Captured

- Gallery Media and per-variant Customization Media are independent asset roles.
- One Customization Media asset belongs to each variant when customization is publish-ready.
- Drafts may be incomplete; published products and the customization editor require readiness.
- Gallery-derived canvas fallback is removed; Customization Media is only a display fallback when a variant gallery is empty.

## Verification

- `pnpm --filter backend test`: passed (21 files, 107 tests).
- `pnpm --filter backend check`: passed.
- `pnpm --filter backend build`: passed; Wrangler emitted a non-fatal EPERM while writing its user log outside the workspace.
- `pnpm --filter admin test`: passed (4 files, 12 tests).
- `pnpm --filter router-cf typecheck`: passed.
- `pnpm --filter router-cf build`: passed; Wrangler emitted the same non-fatal user-log warning.
- `openspec validate separate-variant-customization-media --type change --strict --no-interactive`: passed.
- Final audit removed the last active UI/message references that described gallery/variant images as the customization canvas.
- `pnpm --filter admin build` remains blocked by pre-existing workspace type errors in auth-client/backend generated bindings and unrelated unused imports; the feature-specific helper errors were fixed.

## Next Step

Resolve the repository-wide baseline admin build errors, then rerun `./init.sh` before merging.
