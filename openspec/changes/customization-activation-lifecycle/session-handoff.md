# Session Handoff

## Change

`customization-activation-lifecycle`

## Status

Both review-remediation passes are complete. The change is ready for OpenSpec
validation and archive after migrations `0028` and `0029` are applied in each
target D1 environment.

## Decisions To Preserve

- First-time activation is an unsaved FocusModal Setup Session and commits one
  atomic multipart command only after a valid template and backgrounds for all
  current variants are staged.
- Deactivation retains configuration and background assets; Manage Media hides
  Customization Backgrounds while deactivated.
- Reactivation is direct when already valid, otherwise an atomic repair modal
  supplies only missing backgrounds.
- New variants require an atomic Information + Media submission with a valid
  background only while customization is active.
- Permanent deletion requires deactivation and cleans up customization data,
  background assets, media references, and a matching thumbnail.
- R2 cleanup is asynchronous after a successful D1 lifecycle mutation: record
  a D1 outbox job in the same batch and process it through a scheduled Worker.
  Retry with capped exponential backoff and retain failed jobs for observation.
- Lifecycle and atomic variant commands use a Product revision. Stale requests
  return `409`; the UI reloads rather than automatically retrying.
- Setup and repair modals embed the full local template authoring experience.
  Empty templates remain valid. Variant Creation never edits the shared
  template and continues to require a background in Media when customization
  is active.

See `design.md`, `specs/customization-activation-lifecycle/spec.md`, and
`docs/adr/0013-customization-activation-is-atomic.md` for the full contract.

## Verification

- `./init.sh` passed after remediation: backend check, 188 backend tests,
  backend build, admin build, storefront typecheck, and storefront build.

## Current Implementation State

- The outbox schema/processor and 15-minute cron are present. Permanent
  customization deletion and variant deletion enqueue object-key cleanup rather
  than call R2 inline.
- Setup and Repair render the embedded template editor and submit a local
  template draft. Repair accepts and persists that draft atomically.
- A conditional revision claim prevents two requests that read the same Product
  revision from both performing lifecycle or active-variant mutations.
- Before deployment, apply the D1 schema containing `r2_cleanup_jobs` and the
  `write_token` columns used by the atomic variant batch, plus R2 lease fields
  and `misa_deletion_jobs`.
- Variant and permanent Product deletion now commit local catalog deletion and
  typed MISA outbox jobs; the scheduled Worker owns remote MISA deletion.
- Active customization category membership is transactional with enabled state.
- The legacy JSON Variant create/replacement routes were intentionally removed.
# 2026-08-09 Second Review Remediation Complete

All Section 7 tasks are implemented and verified. Local D1 has migration
`0030_jittery_storm.sql` applied; apply migrations `0028` through `0030` in
each deployed D1 environment before deploying this backend. `./init.sh` passed
with 35 backend test files / 198 tests. The only intentionally retained review
item is the setup editor layout, per product decision.
# 2026-08-09 Third Review Remediation Complete

Section 8 is complete. The current code passes `./init.sh` with 35 backend
test files / 198 tests. Migrations through `0030_jittery_storm.sql` remain
required for deployed D1 environments. Setup editor layout remains intentionally
unchanged by product decision.
