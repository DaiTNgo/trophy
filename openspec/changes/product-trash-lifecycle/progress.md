# Product Trash Lifecycle Progress

## Current State

Implementation is complete. Products now use a `deletedAt` lifecycle marker, the active list and storefront exclude trashed Products, and `/products/trash` provides Restore and permanent deletion operations.

## Confirmed Decisions

- Product deletion from the active catalog is a soft delete into Product Trash.
- Product Trash is managed at `/products/trash`; restore always sets the Product to Draft.
- A trashed Product retains its unique handle until permanently deleted.
- Permanent deletion is only available from Trash and is allowed when historical Orders reference the Product.
- Order reads rely only on immutable snapshots; the live customization-media fallback is removed.
- Soft deletion retains MISA Product Records; permanent deletion performs MISA cleanup.
- This development-mode change updates the schema directly and does not author a migration.

## Verification

- `pnpm --filter backend test`: 24 files, 155 tests passed.
- `pnpm --filter backend check` and `pnpm --filter backend build`: passed.
- `pnpm --filter admin test`: 5 files, 15 tests passed.
- `pnpm --filter admin build`: passed.
- `./init.sh`: passed end to end, including storefront typecheck and production build.
- `git diff --check`: passed.
- Admin dev server: `http://127.0.0.1:5174/products/trash` returned HTTP 200.

## Residual Risk

No database migration was authored, by repository development-mode policy. Environments with existing D1 data must apply the current schema before the new `deleted_at` field can be used.
