# Progress

- 2026-07-12: Updated `apps/admin/src/pages/collections/detail.tsx` so existing collection media is no longer hidden inside the edit drawer. The detail page now shows a dedicated `Media` panel with preview, upload/replace, remove, and `Save Media` actions for faster edits.
- 2026-07-12: Adjusted existing-collection save behavior to stay on the detail page after a successful update instead of navigating back to the collections list, which keeps quick media edits in place.
- 2026-07-12: Verification passed with `pnpm --filter admin test` and `pnpm --filter admin build`.

# Next Step

- Run a manual browser pass on one existing collection to confirm the faster media-edit path feels right with upload, replace, and remove flows.
