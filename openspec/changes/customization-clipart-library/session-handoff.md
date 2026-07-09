Current state:
- The clipart migration is implemented end to end across shared types, backend routes/services, admin UI, storefront runtime, and order/admin snapshot summaries.
- Legacy `/brand-assets/icons` compatibility code has been removed.
- `tasks.md` is fully checked off for `customization-clipart-library`.

Latest verification:
- `pnpm --filter backend test -- src/lib/clipart.test.ts src/routes/admin/clipart.test.ts src/routes/admin/brand-assets.test.ts`
- `pnpm --filter backend check`
- `pnpm --filter backend build`
- `pnpm --filter admin build`
- `./init.sh`

Next recommended step:
1. Archive the OpenSpec change.

Follow-up completed on 2026-07-08:
- Admin clipart WebP previews now render in both the upload review step and the saved media list.
- Verification for the follow-up fix: `pnpm --filter admin test -- src/components/ui/admin-media.test.ts` and `pnpm --filter admin build`.
