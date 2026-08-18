## 1. Product Trash data and backend contract

- [x] 1.1 Add the nullable Product deletion timestamp to the Drizzle schema and extend Product readers/types with its value where Trash management requires it.
- [x] 1.2 Exclude trashed Products from active admin list/detail reads and add the authenticated Product Trash list endpoint with typed validation and JSON responses.
- [x] 1.3 Change active Product deletion to soft deletion and add typed restore and Trash-only permanent-deletion endpoints.
- [x] 1.4 Move MISA cleanup exclusively into permanent deletion while preserving the trashed Product when MISA cleanup fails.
- [x] 1.5 Update backend Product route contract tests for list separation, soft delete, restore-to-Draft, permanent delete, auth, lifecycle-state errors, retained handles, MISA behavior, and historical Order references.

## 2. Order snapshot isolation

- [x] 2.1 Remove live Product Variant Customization Media fallback reads from the admin Order read model.
- [x] 2.2 Add admin Order route coverage proving persisted snapshots render after the original Product and Variant are absent, and malformed snapshots do not fall back to live catalog data.

## 3. Admin Product Trash workflow

- [x] 3.1 Add typed Hono RPC client calls for Trash listing, soft delete, restore, and permanent deletion.
- [x] 3.2 Add the `/products/trash` admin route and a Medusa-style Trash table with loading, empty, error, restore, and confirmed permanent-deletion states.
- [x] 3.3 Add a Products header action linking to Trash and update the active Products delete action/messages for soft deletion.
- [x] 3.4 Add focused admin client or component tests for the Trash lifecycle interactions.

## 4. Verification and change evidence

- [x] 4.1 Run backend route tests, `pnpm --filter backend test`, `pnpm --filter backend check`, and `pnpm --filter backend build`.
- [x] 4.2 Run `pnpm --filter admin test`, `pnpm --filter admin build`, `./init.sh`, and `git diff --check`.
- [x] 4.3 Update this change's `progress.md`, `session-handoff.md`, and task checkboxes with verification evidence and any residual risk.
