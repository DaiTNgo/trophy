# Progress

## 2026-08-09

- Reviewed the partial implementation against the lifecycle spec and completed
  the backend commands plus Product Detail flows.
- Added activation, deactivation, direct reactivation, repair, and permanent
  deletion routes. Activation/repair use multipart parsing, dimension checks,
  and R2/D1 compensation.
- Added Atomic Variant Creation and changed the Product Detail create dialog to
  Information and Media tabs. Active customization requires a locally and
  server-validated background; inactive customization permits none.
- Replaced the Product Detail's immediate enable action with setup/repair
  FocusModals. Commands patch returned state rather than refetching the product.
- Corrected review findings: the JSON variant-create route is blocked only for
  active customization, permanent deletion no longer removes unrelated
  category links, and variant deletion clears a thumbnail/product-media
  reference to its deleted customization background.
- Added multipart parser and lifecycle service tests. Lifecycle route tests
  cover activation, deactivation, direct reactivation, repair-required,
  repair, active-state destructive guards, and permanent-delete background/
  thumbnail cleanup. Admin client tests cover multipart activation, repair, and
  Atomic Variant Creation request assembly.
- Verification passed: `pnpm --filter backend test` (180 tests),
  `pnpm --filter backend check`, `pnpm --filter backend build`,
  `pnpm --filter admin test` (16 tests), `pnpm --filter admin build`, and
  `./init.sh`.

## 2026-08-09 Review Decisions

- The implementation review identified R2/D1 atomicity, cleanup ownership,
  concurrent activation, activation-window variant creation, and atomic
  variant-create cleanup defects. The change is not ready to archive.
- D1 is the source of truth for catalog lifecycle outcomes. Destructive
  commands commit D1 deletion with an R2-cleanup outbox record and return
  success; a scheduled Worker retries R2 deletion with exponential backoff
  capped at 24 hours. Failed jobs are retained and observed. The outbox also
  covers failed-create R2 compensation.
- Lifecycle and atomic variant commands use an optimistic Product revision.
  Stale modal submissions return `409`; the client reloads state and requires
  operator reconciliation rather than retrying automatically.
- Initial activation and reactivation repair stage the existing template
  authoring UI locally. Empty templates remain valid. Variant Creation does
  not edit the shared template; its Media tab retains the required
  Customization Background when customization is active.
- A stored background with the wrong canvas size is repairable through Repair;
  a submitted replacement with the wrong size remains a validation failure.

## 2026-08-09 Remediation In Progress

- Added the D1 `r2_cleanup_jobs` outbox schema, a 15-minute scheduled Worker
  handler, and capped exponential retry processing. Permanent customization
  deletion and variant deletion now enqueue R2 cleanup instead of failing after
  D1 lifecycle state has committed.
- Added `If-Match` Product revision propagation through the Admin lifecycle and
  atomic-variant callers. The routes reject a mismatched revision and successful
  lifecycle commands bump Product `updatedAt`.
- Repair now uploads request-owned objects first, then batches new associations,
  retained-asset replacement, active state, category linkage, and old-object
  cleanup jobs. Activation cleanup now touches only request-owned associations
  and assets and removes request-owned translations on failure.
- Setup and Repair modals now stage the embedded template editor locally and
  submit its draft. Repair multipart requests carry that draft for persistence.
- Remaining: make initial activation and Atomic Variant Creation complete D1
  batches, harden revision claiming at the D1 write boundary, add the missing
  failure/concurrency/outbox tests, and run the full verification suite.

## 2026-08-09 Verification

- Initial activation and Atomic Variant Creation now construct their D1 domain
  graph in one `db.batch`. Atomic Variant Creation uses an internal write token
  so all associations and translations can refer to the auto-increment Variant
  inside that batch; R2 keys use the same opaque token.
- `./init.sh` passed: backend check, 181 backend tests, backend build, admin
  build, storefront typecheck, and storefront build all completed successfully.
- Task 5 remains open until dedicated scheduled-outbox and D1-batch failure
  contract tests are added; passing broad verification alone is not sufficient
  evidence for those failure paths.

## Next Step

Run OpenSpec validation and archive this change when the surrounding release
workflow is ready.

## 2026-08-09 Review Remediation Complete

- Product lifecycle, atomic variant creation, and variant deletion now claim
  `If-Match` through a conditional `products.updated_at` write immediately
  before external or domain mutations. A losing concurrent request returns
  `409` without uploading or deleting its competitor's assets.
- Activation and repair build translation upserts/deletes as D1 batch
  statements with their customization, assets, associations, category link,
  and cleanup records. Batch failure therefore cannot leak request-owned
  translations or restore/delete another request's data.
- Added focused tests for revision-claim conflicts, lifecycle D1 batch
  compensation, atomic-variant D1 batch compensation, translation preparation,
  and successful/retrying scheduled R2 outbox processing.
- Verification passed: `./init.sh` completed backend typecheck, 188 backend
  tests, backend build, admin build, storefront typecheck, and storefront
  build. `git diff --check` also passed before the final evidence update.
- Deployment prerequisite: apply the current D1 schema before enabling this
  Worker version. It introduces `r2_cleanup_jobs` and nullable unique
  `write_token` columns for variants and variant attributes; the Worker cron
  is configured for every 15 minutes in `apps/backend/wrangler.jsonc`.

## 2026-08-09 Follow-up Review Remediation Complete

- Fixed browser preflight for the Product revision contract by allowing
  `If-Match` in the credentialed admin CORS policy and adding an OPTIONS
  contract test.
- Generated and applied local D1 migrations `0028_quiet_hex` and
  `0029_yielding_colleen_wing`. They add write tokens, R2 cleanup jobs, cleanup
  leases, and typed MISA deletion jobs.
- Retired both legacy Product Variant create/replacement route surfaces. Atomic
  Variant Creation is now the sole create path, eliminating the activation
  snapshot race through those endpoints.
- Deactivate/reactivate batch enabled state, Product timestamp, and
  customization-category projection. First activation rejects Products with no
  current Variant.
- Replaced inline MISA deletion during Variant and permanent Product deletion
  with a typed D1 outbox. Scheduled jobs lease work before execution, treat
  MISA `404` as successful idempotent deletion, and retry other failures with
  capped exponential backoff. R2 cleanup uses the same lease discipline.
- Setup/Repair now stages real image dimensions with each local background,
  so the editor never receives a `0 x 0` first-time canvas. Its upload control
  replaces the selected Variant background. Revision conflicts reload Product
  state without discarding the modal draft/files.
- Verification passed: `pnpm --filter backend test` (196 tests), backend
  check/build, `pnpm --filter admin test` (20 tests), admin build, strict
  OpenSpec validation, local D1 migration application, `git diff --check`, and
  `./init.sh`.
# 2026-08-09 Second Review Remediation Complete

- Added Product-scoped `Customization Operation Lease` columns with generated
  migration `0030_jittery_storm.sql`; applied it to local D1. Activation,
  repair, and direct reactivation claim a five-minute lease, while atomic
  variant creation and variant deletion reject a live lease with `409`.
- Reworked Open Editor template saves to require `If-Match`, claim the Product
  revision, and commit translations, category projection, template state, and
  timestamp in one D1 batch without changing `enabled`.
- Activation/repair and atomic variant creation now carry client-declared
  Customization Background dimensions. Backend validates declaration positivity
  and canvas consistency without decoding media or assigning PDF dimensions.
- MISA outbox now completes a `404` only when the error came from
  `DELETE /Products`; token and endpoint failures retry. Permanent Product
  deletion snapshots all reachable Product/Variant assets, deletes their D1
  records, and enqueues R2 cleanup in its deletion batch.
- Added regression coverage for an active Product operation lease and MISA
  token-endpoint `404` retry. Updated multipart/client contract tests.
- Verification: `pnpm --filter backend db:migrate:local`, focused backend/admin
  tests, and `./init.sh` all passed. Full backend suite: 35 files / 198 tests.
# 2026-08-09 Third Review Remediation Complete

- Renewed the Product-scoped Customization Operation Lease immediately before
  activation/repair D1 batches and release a successful repair lease even when
  the Product Thumbnail does not reference its replaced background.
- Permanent Product deletion now snapshots Product Media by `assetId`, includes
  a standalone thumbnail asset, queues all R2 object keys, and deletes
  Product-owned translation records by exact owner type/key pairs.
- PDF preview dimensions are rounded to integer canvas pixels. Atomic Variant
  Creation now validates declared Customization Background file metadata and
  bytes without deriving or hard-coding its dimensions in the backend.
- Verification: focused backend tests and `./init.sh` passed; full backend
  suite remains 35 files / 198 tests.
