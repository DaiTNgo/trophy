## Status

Implemented and verified. All tasks in `tasks.md` are checked off.

## What changed

- Clipart authoring moved from asset allow-list/default-asset configuration to category-scope configuration.
- Admin inspector now exposes `Category rule`, `Clipart category`, and `Allowed categories`.
- Storefront/admin preview derive clipart options from active categories and runtime clipart assets, not from persisted asset subsets.
- Storefront-safe backend serialization now looks up active clipart assets by referenced category IDs.

## Verification already run

- `pnpm --filter customization test`
- `pnpm --filter admin test`
- `pnpm --filter admin build`
- `pnpm --filter router-cf test`
- `pnpm --filter router-cf build`
- `pnpm --filter backend test -- src/routes/storefront/products.test.ts src/routes/storefront/orders.test.ts`
- `pnpm --filter backend check`
- `pnpm --filter backend build`
- `./init.sh`

## Follow-up only if scope expands later

- If the product later needs per-layer asset curation inside a category, add it back as a separate explicit feature instead of reusing the removed authoring model.
