# Customization Admin Minimal Block Editor Design

## Scope

Update the customization authoring flow in `apps/admin` and the related shared/storefront contract so the admin editor only exposes the fields needed for day-to-day v1 template setup.

This design applies to the current block-only customization model.

## Goals

- Reduce admin cognitive load when creating or editing customization blocks.
- Show only the fields relevant to the selected block type.
- Keep placement visual on the preview instead of manual geometry entry.
- Support fixed or shopper-selectable text color and font-family configuration.
- Support `hide/unhide` and `delete` as separate admin block-management actions.
- Let the administrator test the current draft through a same-page preview mode without going to the storefront.
- Preserve the storefront behavior where shoppers fill a form beside the product image and see the result rendered into the admin-fixed block position.

## Non-Goals

- No v1 support for manual DPI, bleed, safe margin, or direct `x/y/width/height` form inputs.
- No reintroduction of `zone` or `surface` abstractions.
- No full production-font pipeline redesign in this slice.
- No perpetual-list block support in v1.

## Block Authoring Model

Each block continues to be the single source of truth for:

- what shopper control should be rendered
- what default value is used
- whether the block is required
- whether it is conditionally visible
- where the rendered output appears on the product preview

The admin does not edit shopper controls directly on the image. The admin defines the block schema and places the block visually on the preview. The storefront maps the block schema to HTML controls and maps shopper values back into preview layers using the block identifier.

## Admin UI Shape

The editor should use one selected-block panel with dynamic sections.

It should also expose two management actions for the selected block:

- `Hide/Unhide`
- `Delete`

At the page level, the editor should expose two modes:

- `Edit`
- `Preview`

### Shared fields for every block

- block type
- label
- help text
- required
- visibility condition

### Text block fields

For `text_single`:

- default value
- max characters
- uppercase
- color mode: `fixed` or `user_selectable`
- fixed color value or selectable color options
- font-family mode: `fixed` or `user_selectable`
- fixed font family or selectable font-family options

For `text_multi`:

- default value
- max characters
- max lines
- color mode: `fixed` or `user_selectable`
- fixed color value or selectable color options
- font-family mode: `fixed` or `user_selectable`
- fixed font family or selectable font-family options

### Icon picker fields

- icon/background option list
- default option
- allow none

### Image upload fields

- accepted file types
- max file size
- require artwork rights

### Non-rendering control block fields

For `radio`, `select`, `color`, and `checkbox`, show only the controls needed to define default value and options.

## Fields Removed From the Primary Admin Form

The v1 admin form should not expose these as day-to-day inputs:

- DPI
- bleed
- safe margin
- manual `x`
- manual `y`
- manual `width`
- manual `height`
- minimum/maximum font size
- alignment
- production method
- internal asset identifiers

These remain internal defaults or system-managed values in the contract where needed for rendering/export.

## Placement Model

Placement remains visual only:

- admin drags/resizes a renderable block on the preview
- the editor persists normalized preview-relative bounds
- the storefront rehydrates those bounds to render shopper values in the correct fixed position

No manual geometry fields are shown in the admin settings panel.

## Preview Mode

The admin page should support a same-page preview mode that behaves like a shopper simulator for the current draft.

### Edit mode

- show block overlays
- show drag/resize/rotate handles
- show template/block authoring controls

### Preview mode

- hide block handles and authoring controls
- render the same schema-driven form behavior used by the storefront
- allow the administrator to type text, choose options, toggle confirmations, and upload test assets
- keep those values local to preview mode rather than merging them into template configuration

`Preview mode` should always rebuild from the current `templateDraft`, so testing reflects the newest unsaved admin edits.

## Block Lifecycle Actions

### Hide / Unhide

- Hiding a block keeps it in the template
- Its configuration remains intact
- The shopper does not see it in the form
- The shopper preview does not render it
- The admin can unhide it later without recreating its settings

### Delete

- Deleting a block removes it permanently from the template draft
- Its configuration and placement are removed with it
- If another block depends on it through a visibility condition, delete must be blocked
- The editor should explain which dependent blocks must be updated first

## Storefront Impact

The storefront form remains schema-driven:

- `text_single` -> input
- `text_multi` -> textarea
- `icon_picker` -> option grid
- `image_upload` -> file input
- `radio` / `select` / `color` / `checkbox` -> corresponding HTML controls

For text blocks:

- if color mode is `fixed`, apply the configured color automatically
- if color mode is `user_selectable`, render only the allowed color selector for that block
- if font-family mode is `fixed`, apply the configured font automatically
- if font-family mode is `user_selectable`, render only the allowed font-family selector for that block

The shopper never changes placement.

The admin preview should reuse this same rendering logic instead of maintaining a separate testing renderer.

## Data Model Adjustments

Text blocks should carry explicit style-choice policies instead of raw low-level styling fields only.

At a minimum, the shared contract should represent:

- color mode (`fixed` | `user_selectable`)
- fixed color or allowed color options
- font-family mode (`fixed` | `user_selectable`)
- fixed font family or allowed font-family options

The saved design should only store style values that are explicitly allowed by the published block schema.

## Error Handling

- Hidden block fields must not leak into other block types.
- Invalid shopper style selections must be rejected by shared validation and backend validation.
- If a text block is fixed-style, the storefront must not render style selectors for that block.
- If a selectable-style block has no allowed options, publication or validation should fail.
- Delete must fail safely when other blocks still depend on the target block.

## Verification

- `openspec validate cup-customization-production --strict`
- `pnpm --filter @trophy/customization test`
- `pnpm --filter admin build`
- `pnpm --filter router-cf build`
- `pnpm --filter backend build`
