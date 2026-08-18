## 1. Lifecycle backend contracts

- [x] 1.1 Replace the immediate customization-enable path with typed Hono RPC
  commands for initial activation, direct reactivation, repair activation, and
  deactivation.
- [x] 1.2 Implement a customization lifecycle service that determines active,
  deactivated, and missing-background states without introducing a persisted
  setup-draft state.
- [x] 1.3 Validate templates, required variant backgrounds, and the Background
  Size Contract before lifecycle commands persist any customization data or
  assets.
- [x] 1.4 Implement R2/D1 compensation for multipart activation and repair
  failures so invalid or failed commands leave no submitted background assets.

## 2. Variant and asset lifecycle

- [x] 2.1 Implement Atomic Variant Creation as a typed multipart Hono RPC
  command that creates information, optional Gallery Media, and the required
  Customization Background together when customization is active.
- [x] 2.2 Keep variant creation without a Customization Background available
  only while customization is deactivated, and preserve active customization
  when an otherwise permitted variant deletion succeeds.
- [x] 2.3 Restrict permanent customization deletion to deactivated
  customization and implement its cascade through template data,
  translations, background assets, Product Media references, and matching
  Product Thumbnail state.
- [x] 2.4 Remove or narrow obsolete routes and services that can bypass the
  lifecycle contracts, without preserving deprecated compatibility paths.

## 3. Admin product-detail workflows

- [x] 3.1 Build the first-time Customization Setup FocusModal that stages the
  template and all current variant backgrounds locally and calls atomic
  activation only on submit.
- [x] 3.2 Add deactivation, direct reactivation, and missing-background repair
  controls that patch only changed product state and keep cancelled or failed
  sessions unsaved.
- [x] 3.3 Update Manage Media to expose Gallery Media only while customization
  is deactivated and to restore Customization Background management when it is
  active.
- [x] 3.4 Rework Variant Creation into Information and Media tabs, requiring a
  locally validated Customization Background only for active customization.
- [x] 3.5 Add the deactivated-only destructive confirmation flow for permanent
  customization deletion.

## 4. Verification and change evidence

- [x] 4.1 Add backend service and API contract tests for lifecycle success,
  validation failures, authorization, atomic cleanup, direct reactivation,
  repair, variant creation, deletion, and permanent-delete thumbnail cleanup.
- [x] 4.2 Add focused admin tests for setup cancellation, active/deactivated
  media visibility, repair behavior, and variant Media-tab validation.
- [x] 4.3 Run `pnpm --filter backend test`, `pnpm --filter backend check`,
  `pnpm --filter backend build`, `pnpm --filter admin build`, and `./init.sh`.
- [x] 4.4 Update this change's progress and session handoff with verification
  evidence, remaining risks, and implementation decisions.

## 5. Review remediation

- [x] 5.1 Add Product optimistic revision checks to lifecycle and variant
  commands; make each request's D1 write set atomic and request-owned.
- [x] 5.2 Add the D1 R2-cleanup outbox, scheduled Worker retry, and failure
  observability for destructive cleanup and failed-create compensation.
- [x] 5.3 Rework initial activation and reactivation repair to stage the
  existing template editor locally; keep Variant Creation template-free while
  retaining its required active-customization background in Media.
- [x] 5.4 Add contract coverage for concurrency, D1 batch failures, R2 cleanup
  retry, translation cleanup, and orphan-free atomic variant creation.
- [x] 5.5 Re-run backend/admin checks and `./init.sh`, then update change
  evidence before archiving.

## 6. Follow-up review remediation

- [x] 6.1 Permit `If-Match` through admin CORS, add preflight coverage, and
  retain the generated D1 migrations for `write_token`, cleanup jobs, and
  leases.
- [x] 6.2 Remove legacy Variant creation/replacement routes so Atomic Variant
  Creation is the only Product Variant creation contract.
- [x] 6.3 Batch deactivation/reactivation with category projection and reject
  first activation without a current Variant.
- [x] 6.4 Add expiring leases to R2 cleanup and a typed MISA-deletion outbox;
  use it for Variant deletion and permanent Product deletion.
- [x] 6.5 Stage real background dimensions in Setup/Repair, wire editor upload
  replacement, and reload authoritative Product state after a `409` while
  retaining local modal state.
- [x] 6.6 Add focused API/client/outbox coverage, apply local migrations, run
  OpenSpec validation, and rerun `./init.sh`.

## 7. Second review remediation

- [x] 7.1 Add a Product-scoped expiring Customization Operation Lease and
  enforce it across lifecycle and Variant mutations, with deterministic race
  and expiry-recovery coverage.
- [x] 7.2 Make Open Editor template saves revisioned and one D1 batch; it must
  never reactivate customization as a side effect.
- [x] 7.3 Carry client-declared background dimensions through multipart
  contracts and validate declaration consistency without backend media decode.
- [x] 7.4 Mark MISA deletion complete only for `DELETE /Products` returning
  `404`; retry token and other endpoint failures.
- [x] 7.5 Permanently delete all Product-owned asset rows and enqueue every
  associated R2 object for durable cleanup.
- [x] 7.6 Add focused route/client/outbox tests, run full verification, and
  update change-local evidence.

## 8. Third review remediation

- [x] 8.1 Renew a live Customization Operation Lease immediately before R2
  lifecycle work commits and clear it unconditionally on successful repair.
- [x] 8.2 Include Product Media `assetId` and standalone thumbnail assets in
  permanent-deletion cleanup, and delete translations with their owners.
- [x] 8.3 Keep PDF canvas dimensions integral at the client and avoid backend
  image-dimension decoding for declared atomic Customization Backgrounds.
- [x] 8.4 Run focused tests and `./init.sh`, then update change-local evidence.
