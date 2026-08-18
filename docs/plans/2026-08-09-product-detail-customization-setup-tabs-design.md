# Product Detail Customization Setup Tabs

## Goal

Make first-time customization setup and reactivation repair a two-step modal so
operators cannot open the template editor until every affected variant has a
valid Customization Media file.

## Context

`CustomizationBackgroundModal` currently puts the per-variant upload controls
and the embedded `CreateProductCustomization` editor on one narrow modal page.
The editor is constrained by `max-w-2xl`, unlike the Create Product flow, and
an operator can edit a template before the background set is valid.

## Chosen Design

The modal will use two Medusa `ProgressTabs`:

1. **Custom media** is the initial tab. It displays a table with `Variant` and
   `Custom media` columns. Each row has one staging file, a Choose/Replace
   action, and a remove action when selected.
2. **Custom editor** is disabled until the staged media is valid. Validity
   means every listed variant has a staged image with positive dimensions and
   all selected images have identical dimensions. The check runs whenever a
   selection is added or removed.

When validation succeeds, the Custom editor tab becomes interactive and uses
the full available `FocusModal` content area, matching the Create Product
customization layout. The existing atomic activation/repair submission remains
the server-side authority and repeats validation before persistence.

## Alternatives Considered

- Validate only when the editor tab is selected. This reduces state but leaves
  the tab apparently available before rejecting navigation.
- Add a separate Continue button to confirm media. This makes the transition
  explicit but introduces an unnecessary confirmation state.

The chosen continuously validated disabled tab makes readiness visible while
preserving the existing local staging model.

## Error Handling And Tests

Unreadable images keep their row invalid and show the existing toast. Removing
or replacing a selected file recalculates readiness and returns the operator to
the media step if the editor would otherwise become inaccessible. Focused
admin tests will cover the validation helper and tab gate; the existing backend
atomic command remains unchanged.
