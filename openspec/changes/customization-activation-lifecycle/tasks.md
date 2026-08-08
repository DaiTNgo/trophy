## 1. Lifecycle backend contracts

- [ ] 1.1 Replace the immediate customization-enable path with typed Hono RPC
  commands for initial activation, direct reactivation, repair activation, and
  deactivation.
- [ ] 1.2 Implement a customization lifecycle service that determines active,
  deactivated, and missing-background states without introducing a persisted
  setup-draft state.
- [ ] 1.3 Validate templates, required variant backgrounds, and the Background
  Size Contract before lifecycle commands persist any customization data or
  assets.
- [ ] 1.4 Implement R2/D1 compensation for multipart activation and repair
  failures so invalid or failed commands leave no submitted background assets.

## 2. Variant and asset lifecycle

- [ ] 2.1 Implement Atomic Variant Creation as a typed multipart Hono RPC
  command that creates information, optional Gallery Media, and the required
  Customization Background together when customization is active.
- [ ] 2.2 Keep variant creation without a Customization Background available
  only while customization is deactivated, and preserve active customization
  when an otherwise permitted variant deletion succeeds.
- [ ] 2.3 Restrict permanent customization deletion to deactivated
  customization and implement its cascade through template data,
  translations, background assets, Product Media references, and matching
  Product Thumbnail state.
- [ ] 2.4 Remove or narrow obsolete routes and services that can bypass the
  lifecycle contracts, without preserving deprecated compatibility paths.

## 3. Admin product-detail workflows

- [ ] 3.1 Build the first-time Customization Setup FocusModal that stages the
  template and all current variant backgrounds locally and calls atomic
  activation only on submit.
- [ ] 3.2 Add deactivation, direct reactivation, and missing-background repair
  controls that patch only changed product state and keep cancelled or failed
  sessions unsaved.
- [ ] 3.3 Update Manage Media to expose Gallery Media only while customization
  is deactivated and to restore Customization Background management when it is
  active.
- [ ] 3.4 Rework Variant Creation into Information and Media tabs, requiring a
  locally validated Customization Background only for active customization.
- [ ] 3.5 Add the deactivated-only destructive confirmation flow for permanent
  customization deletion.

## 4. Verification and change evidence

- [ ] 4.1 Add backend service and API contract tests for lifecycle success,
  validation failures, authorization, atomic cleanup, direct reactivation,
  repair, variant creation, deletion, and permanent-delete thumbnail cleanup.
- [ ] 4.2 Add focused admin tests for setup cancellation, active/deactivated
  media visibility, repair behavior, and variant Media-tab validation.
- [ ] 4.3 Run `pnpm --filter backend test`, `pnpm --filter backend check`,
  `pnpm --filter backend build`, `pnpm --filter admin build`, and `./init.sh`.
- [ ] 4.4 Update this change's progress and session handoff with verification
  evidence, remaining risks, and implementation decisions.
