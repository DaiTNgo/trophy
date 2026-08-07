# Session Handoff: Product Trash Lifecycle

## Scope

Implement `openspec/changes/product-trash-lifecycle` only. The source of truth is this change folder.

## Read First

1. `proposal.md`
2. `design.md`
3. `specs/admin-product-trash/spec.md`
4. `specs/order-snapshot-isolation/spec.md`
5. `tasks.md`

## Completed

- Added `products.deleted_at` and active/Trash query separation.
- Changed active Product deletion to soft delete; added restore-to-Draft and Trash-only permanent deletion.
- Kept MISA records at soft delete and cleanup at permanent deletion.
- Removed live customization-media fallback from admin Order reads.
- Added Hono RPC Trash lifecycle calls, `/products/trash`, client coverage, backend contract coverage, and a Products header action.

## Verification

All tasks are complete. `./init.sh` passed with 155 backend tests; admin tests, backend/admin builds, and `git diff --check` also passed. The admin dev server served `/products/trash` with HTTP 200.
