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
if a later database step fails. Dedicated commands were chosen over reusing
immediate variant-media uploads because the latter intentionally persist each
asset independently and cannot provide a valid all-or-nothing activation.

### Separate modal responsibilities

The Product Detail customization control opens a FocusModal for initial setup
and, only when necessary, reactivation repair. Variant creation uses its own
FocusModal with Information and Media tabs. Its Media tab requires a
Customization Background only while customization is active; Gallery Media is
optional. Variant Details and Manage Media remain separate from that create
flow.

While deactivated, Manage Media displays and mutates Gallery Media only. It
does not display or offer actions for retained Customization Backgrounds. This
prevents accidental background changes while retaining the data needed for a
direct reactivation.

### Validate current variants at the command boundary

The activation service determines whether every current variant has a valid
background and validates same-size dimensions across the full set. A direct
reactivation succeeds only when that condition already holds; otherwise the
client receives the missing variant identities needed to open the repair
session. The server repeats validation for every submitted repair file, so the
client preview cannot be treated as authoritative.

Permitted variant deletion while active removes that variant and its background
but does not deactivate customization, because the contract applies to the
remaining variants.

### Make permanent deletion an explicit destructive cascade

Only a deactivated customization exposes permanent deletion. The command
deletes the customization record, template layers and form fields,
translations, background associations and their R2/D1 assets, Product Media
references to those assets, and clears `thumbnail_asset_id` where it points to
a deleted background. It does not delete gallery assets that are not
Customization Backgrounds.

This is a distinct command rather than a deactivation option so operators can
retain work safely by default.

## Risks / Trade-offs

- [Multipart request complexity and R2/D1 split atomicity] → Validate before
  writes, track assets created by the request, and compensate those assets if a
  database operation fails. Add failure-path API tests.
- [Stale product state after a command] → Return the changed customization or
  variant resource from commands and patch the corresponding admin state rather
  than refetching the full product solely for media changes.
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
