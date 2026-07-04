## 1. Backend Route Surface

- [x] 1.1 Add operation-specific admin option routes for creating/updating/deleting option definitions and option values without replacing the full option set.
- [x] 1.2 Add backend guards that reject deleting option values still referenced by variants.
- [x] 1.3 Add operation-specific admin variant detail routes for creating/updating/deleting one variant without replacing the full variant set.
- [x] 1.4 Add backend guards that reject duplicate variant option combinations and variants that reference option values outside the product.
- [x] 1.5 Add price-specific single or bulk variant price routes that update only submitted price fields.
- [x] 1.6 Add stock-specific single or bulk variant inventory routes that update only submitted inventory fields.
- [x] 1.7 Add variant media route support that updates one variant's media without replacing unrelated variant fields.
- [x] 1.8 Preserve existing full-replace routes only for legacy/create callers, and document in code/client boundaries that product detail edit actions must not call them.

## 2. Backend Verification

- [x] 2.1 Add route-level API contract tests for option create/update/delete success and failure modes.
- [x] 2.2 Add route-level API contract tests for variant create/update/delete success and failure modes.
- [x] 2.3 Add route-level API contract tests proving price-only updates preserve non-price variant fields.
- [x] 2.4 Add route-level API contract tests proving stock-only updates preserve non-stock variant fields.
- [x] 2.5 Add route-level API contract tests proving media updates preserve non-media variant fields and enforce customization readiness for published customizable products.
- [x] 2.6 Run `pnpm --filter backend test`, `pnpm --filter backend check`, and `pnpm --filter backend build`.

## 3. Admin Client Contracts

- [x] 3.1 Add option-specific client methods for product detail option management.
- [x] 3.2 Add variant detail, price, stock, and media-specific client methods.
- [x] 3.3 Keep full-replace client methods out of the product detail edit path.
- [x] 3.4 Update product client types so new methods accept only the fields owned by their operation.

## 4. Admin Product Detail UI

- [x] 4.1 Replace the current variants/pricing card drawer with a Medusa-like variants table or DataTable surface based on Trophy fields.
- [x] 4.2 Add a manage-options side window for option definitions and values without automatic variant regeneration.
- [x] 4.3 Add explicit create/edit/delete variant row flows for variant title, option selections, SKU, and allow backorder.
- [x] 4.4 Add a price bulk editor that submits only variant price changes.
- [x] 4.5 Add a stock bulk editor that submits only variant inventory changes.
- [x] 4.6 Add variant media management that keeps Trophy variant media semantics for customization backgrounds.
- [x] 4.7 Ensure UI copy and empty/error states use Trophy domain language from `CONTEXT.md`.

## 5. Final Verification And State

- [x] 5.1 Run `pnpm --filter admin build`.
- [x] 5.2 Run `./init.sh`.
- [x] 5.3 Update this change's `progress.md` with implementation evidence and remaining risks.
- [x] 5.4 Update this change's `session-handoff.md` with restart notes.
- [x] 5.5 Run `openspec validate medusa-product-variant-management --strict`.
