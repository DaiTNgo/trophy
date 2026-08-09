## Context

Customization currently uses one persisted enabled flag and product publish
validation requires Customization Media for every variant. On a published
product, setting that flag before backgrounds are supplied leaves no valid
operator path to finish setup. The existing independent Variant Media
Management workflow is correct for persisted gallery assets, but cannot make a
newly active customization temporarily incomplete.

This change applies the lifecycle defined in
`docs/adr/0013-customization-activation-is-atomic.md` to backend commands and
the Admin Product Detail UI. The application is in dev mode, so replaced route
contracts and UI paths can be removed instead of preserved as compatibility
flows.

## Goals / Non-Goals

**Goals:**
- Keep a published product purchasable as an ordinary product until a complete
  customization can be activated.
- Make initial setup, reactivation repair, and creation of a variant on an
  active customizable product atomic.
- Preserve saved customization work across deactivation without exposing
  Customization Background editing in normal Variant Media Management.
- Make permanent deletion explicit and fully clean up background-derived media
  references.
- Keep admin consumers typed through exported Hono RPC route contracts.

**Non-Goals:**
- Introduce a persisted setup-draft state or a third customization status.
- Change shopper customization rendering beyond its existing dependence on
  active customization.
- Change Gallery Media's immediate upload/remove workflow or introduce gallery
  ordering.
- Support partial setup saves, partial activation, or best-effort background
  repair.

## Decisions

### Model lifecycle with a saved record plus `enabled`

No customization record means the product has never completed setup. A saved
record with `enabled: true` is active; a saved record with `enabled: false` is
deactivated but retained. A first-time setup is local-only state in a
FocusModal, not a database value.

This retains a simple current schema while distinguishing permanent deletion
from deactivation. A `setup` enum or persisted draft was rejected because it
would require asset and cleanup semantics for abandoned partial work.

### Use dedicated atomic multipart commands

The backend will provide typed admin commands for:

- activating initial setup with a complete template and one background file per
  current variant;
- reactivating retained customization, directly when all backgrounds are still
  valid or with files for exactly the missing backgrounds; and
- creating a variant with its Information and Media-tab payload in one command
  when customization is active.

Each command parses and validates all JSON and files, including the Background
Size Contract, before it persists the related domain records. It writes no
partial domain result on validation failure and compensates created R2 assets
if a later database step fails. The D1 writes, including translations, media
associations, category linkage, Product revision, and any R2 cleanup outbox
records, commit together in one batch. R2 is outside that transaction: a
failed-create path deletes request-owned objects best-effort and durably queues
any failed compensation; destructive commands commit their D1 deletion and
enqueue R2 cleanup rather than reporting an error after the catalog change has
succeeded. Dedicated commands were chosen over reusing
immediate variant-media uploads because the latter intentionally persist each
asset independently and cannot provide a valid all-or-nothing activation.

Every lifecycle or variant command carries the Product revision read when its
modal opened. A stale request receives `409` and the client reloads the Product
without automatically retrying. Lifecycle commands additionally claim a
short-lived Product-scoped Customization Operation Lease before R2 work;
conflicting Variant mutations receive `409` while that lease is live. The
final D1 batch clears only its own lease token, and a later request may replace
an expired lease after an interrupted operation. This reserves the complete
R2-to-D1 lifecycle window rather than only its first Product timestamp write.
The client retains its local draft and files for the operator to reconcile
against refreshed Product state.

The Admin preserves the unsaved modal draft and staged files on a `409`, then
reloads the authoritative Product so the operator can reconcile deliberately.

### Separate modal responsibilities

The Product Detail customization control opens a FocusModal for initial setup
and, only when necessary, reactivation repair. Both modals embed the existing
Customization authoring experience and stage a local template draft alongside
their backgrounds; an empty template remains valid when it satisfies the
existing schema. Variant creation uses its own FocusModal with Information and
Media tabs, not a template editor: its Media tab requires a Customization
Background only while customization is active, while Gallery Media is optional.
The shared Product template is managed only from Product Detail Customization,
so creating one variant cannot invisibly alter other variants' shopper
experience. Variant Details and Manage Media remain separate from that create
flow.

While deactivated, Manage Media displays and mutates Gallery Media only. It
does not display or offer actions for retained Customization Backgrounds. This
prevents accidental background changes while retaining the data needed for a
direct reactivation.

### Treat category membership and backgrounds as lifecycle invariants

The `customization` category link is a required projection of an active
customization: active Products are linked, while deactivated and permanently
deleted customizations are unlinked. Direct deactivate/reactivate commands
commit that link mutation, the enabled state, and the Product revision in one
D1 batch.

Initial activation requires at least one current Product Variant. Its staged
background files establish the candidate canvas from client-declared dimensions;
every remaining declaration must match it. The client validates media before
submission, including PDF rasterization, while the backend only checks the
declared dimensions for positivity and consistency with submitted or saved
canvas metadata. The embedded editor uses those staged dimensions, never an
uninitialized persisted draft canvas. The legacy JSON variant-create route is
removed, leaving Atomic Variant Creation as the only Variant creation contract
so a concurrent create cannot bypass the active customization background
invariant.

### Delete MISA records asynchronously after catalog deletion

Variant deletion and permanent Product deletion commit local catalog removal
and typed MISA deletion jobs in one D1 batch. The scheduled Worker leases each
job before calling MISA, treats only a `404` returned by `DELETE /Products` as
completed idempotent deletion, and retries authentication, configuration, and
all other failures with capped exponential backoff. This follows the same
durable-work pattern as R2 cleanup without conflating their distinct ownership
and payload types.

### Validate current variants at the command boundary

The activation service determines whether every current variant has a valid
background and validates same-size dimensions across the full set. A direct
reactivation succeeds only when that condition already holds; otherwise the
client receives variants that lack a valid background, including a persisted
background with the wrong canvas size, to open the repair session. The server
repeats validation for every submitted repair file, so the client preview
cannot be treated as authoritative. A replacement file with the wrong canvas
size is rejected and never persisted as a repair.

Permitted variant deletion while active removes that variant and its background
but does not deactivate customization, because the contract applies to the
remaining variants.

### Make permanent deletion an explicit destructive cascade

Only a deactivated customization exposes permanent deletion. The command
deletes the customization record, template layers and form fields,
translations, background associations and their D1 assets, Product Media
references to those assets, and clears `thumbnail_asset_id` where it points to
a deleted background. It queues R2 object deletion through the D1 outbox and
returns the successful catalog result without exposing cleanup status to the
Admin UI. Permanent Product deletion likewise removes every remaining
Product-owned, Gallery, and Customization Background asset and enqueues their
R2 cleanup; it retains no media after the catalog record is gone.

This is a distinct command rather than a deactivation option so operators can
retain work safely by default.

## Risks / Trade-offs

- [Multipart request complexity and R2/D1 split atomicity] → Validate before
  writes, identify every request-owned object, commit all D1 mutations and
  cleanup jobs together, and retry failed R2 compensation through the outbox.
  Add failure-path API tests.
- [Stale product state after a command] → Require the Product revision for
  lifecycle and variant commands. A stale request returns `409`; the Admin UI
  reloads authoritative state and lets the operator reconcile its local draft.
- [Deferred R2 cleanup] → Run bounded scheduled cleanup with exponential
  backoff capped at 24 hours. Keep failed jobs durable and visible through
  logging/monitoring; no cleanup status is exposed in normal Admin responses.
- [Existing `PUT` enable path can bypass lifecycle rules] → Remove or narrow it
  so first activation and repair use the dedicated command only.
- [Thumbnail points to a deleted background] → Perform thumbnail clearing as
  part of the permanent-deletion transaction and cover it explicitly.
- [New variants make retained customization incomplete] → Allow that only while
  deactivated; require atomic background creation whenever it is active.

## Migration Plan

1. Replace the current immediate enable/disable behavior with lifecycle
   commands and update the Product Detail UI to consume their Hono RPC types.
2. Add route and service tests for success, validation, authorization, and
   asset-cleanup failures before exposing the controls.
3. Deploy backend and admin together. No persisted incomplete state needs data
   migration; existing enabled records remain active and existing disabled
   records are treated as retained configurations if present.
4. Roll back by restoring the prior application version. Since commands are
   additive until the deprecated immediate-enable path is removed, database
   shape remains compatible during rollout.

## Open Questions

- None. The UI copy and exact request field names are implementation details
  that must preserve the lifecycle contracts in the specification.
