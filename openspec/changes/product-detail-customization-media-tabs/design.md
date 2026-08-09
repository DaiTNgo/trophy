## Context

The Product Detail customization lifecycle uses `CustomizationBackgroundModal`
for both initial activation and repair. It stages files locally and already
validates completeness and dimensions when the operator submits. The modal
currently renders upload controls and `CreateProductCustomization` together in
one `max-w-2xl` container, which permits premature template editing and gives
the editor less room than the Create Product flow.

## Goals / Non-Goals

**Goals:**

- Make media readiness visible before template authoring.
- Gate the editor using client-side staged-media validation without weakening
  the existing authoritative atomic backend validation.
- Reuse the Create Product editor component and its available layout width.
- Apply identical behavior to activation and missing-background repair.

**Non-Goals:**

- Change background persistence, multipart requests, or Hono RPC contracts.
- Persist partial setup drafts or uploaded media before activation/repair.
- Change the standalone editor for already-active customization.

## Decisions

### Use a two-tab modal with a disabled editor trigger

The setup session will render `Custom media` and `Custom editor` tabs. The
media tab is selected at open and contains a compact table of the affected
variant and its staged Customization Media. The editor trigger has disabled
state until the current staging set is complete and dimension-consistent.

This avoids a separate confirmation step and gives a visible, non-clickable
representation of the dependency. Validating only after tab selection was
rejected because it makes the editor appear available before showing an error.

### Derive readiness from staged media

A pure helper will derive a readiness result from the modal's affected variants
and staged files. It will require exactly one staged file per variant, positive
integral dimensions, and one shared width/height pair. Repair will additionally
require that pair to match its persisted canvas dimensions.

The submit handler retains the same validation as defense in depth. The client
gate only controls navigation and cannot make an invalid activation succeed.

### Match the Create Product editor frame

The editor tab will use the modal body's full usable width and height rather
than an inner `max-w-2xl` wrapper. `CreateProductCustomization` remains the
single editor implementation, keeping its four-column layout and fixed editor
height consistent with Create Product.

## Risks / Trade-offs

- [A file is removed while the editor is selected] → Recalculate readiness on
  every staging change and return to `Custom media` when it becomes invalid.
- [Client-side dimension reading fails] → Keep readiness false and show the
  existing file-read error toast.
- [Layout changes break compact viewports] → Preserve modal scrolling and use
  the editor's existing responsive overflow constraints.

## Migration Plan

1. Deploy the admin-only UI change with no backend migration.
2. Existing product customizations and active editor routes remain unchanged.
3. Roll back by restoring the prior Product Detail modal; staged files are
   browser-local and leave no persisted state.

## Open Questions

- None.
