## Context

The current customization flow uses a block-only contract where one object owns shopper form behavior, canvas placement, visual order, and rendering rules. Recent work added block placement, preview mode, hidden blocks, uploaded-media crop, and text style policies, but the UI is still a two-column form/canvas page and the model is not shaped for editor concepts such as a visual layer stack, separate shopper form order, text paths, or shape clipping.

The approved product direction is a Figma-like editor in the admin app: a top document header, left vertical rail, central canvas, right selection inspector, and a full-screen Preview dialog. Because the repository is in dev mode, this change can replace the current customization contract instead of preserving old deprecated paths.

## Goals / Non-Goals

**Goals:**

- Introduce a new editor template model with `background`, `layers`, and `formFields`.
- Build the admin authoring UI around `Blocks`, `Layers`, `Form`, and `Background` rail tabs.
- Support Text layers with max-line fitting, min/max font sizes, color/font policies, alignment, and preset/custom paths.
- Support Image Shape layers with fixed shape types, aspect-ratio locking, cover-fit upload crop, and shape clipping.
- Keep visual layer stack independent from shopper form order.
- Update storefront/runtime/backend validation and export surfaces to consume the editor model.

**Non-Goals:**

- No layer groups in v1.
- No decorative published shape fill or stroke.
- No background crop or transform.
- No UI controls for image accepted file types, max file size, or DPI in this pass.
- No long-term compatibility with the old block-only template contract.

## Decisions

### Use an explicit editor model

The shared contract will represent templates as `background`, `layers`, and `formFields`.

`background` owns the single template background asset and intrinsic dimensions. `layers` own visual/editor objects, including name, hidden, locked, z-index, geometry, and type-specific render config. `formFields` own shopper-facing labels, help text, placeholders, required state, and form order.

This replaces the old `blocks[]` contract because block objects were carrying unrelated responsibilities. The alternative was to keep `blocks[]` and add more fields, but that would make layer stack and form order ambiguous and would make custom text paths harder to reason about.

### Keep one renderable layer linked to one form field in v1

Each Text or Image Shape layer will have one linked form field in v1. This keeps admin and storefront behavior predictable while still separating visual order from form order. A future version can add decorative/non-form layers without changing the core structure.

### Store geometry as ratios and edit as pixels

Layer geometry persists as ratios relative to the background intrinsic size. The admin inspector displays `X`, `Y`, `W`, and `H` as pixels in the background coordinate system. This matches editor expectations while preserving responsive rendering and deterministic export.

Text layers expose `X`, `Y`, and `W`; height is derived from max lines and max font size. Image Shape layers expose `X`, `Y`, `W`, and `H`.

### Use a full-screen Preview dialog

Preview opens a full-screen dialog instead of switching the editor layout. This keeps editor selection, active rail tab, path-edit state, and inspector context intact while letting admins test the shopper form and crop behavior against the current draft.

### Text overflow trims silently

Runtime text fitting will reduce font size from max to min. If text still cannot fit, the renderer trims overflow and renders only the fitted content without a warning. This matches the approved UX: shoppers infer the limit from the live preview rather than seeing validation errors for long text.

### Custom text paths use Bezier points

Preset paths cover straight, arc up, arc down, circle top, and circle bottom. Custom paths use anchor points and Bezier handles. Path text is always one line, and alignment is measured along path length.

### Image crop is uniform scale plus pan

Image Shape uploads use cover fit and clip to the admin-defined shape. Shopper/admin preview crop state stores only uniform zoom plus pan ratios. The runtime must not support independent horizontal or vertical image stretching.

### Delete has scoped undo, not full history

Layer deletion happens immediately and shows an Undo toast. Undo restores the deleted layer, linked form field, stack order, form order, properties, and selection. Full undo/redo for every editor action is out of scope.

## Risks / Trade-offs

- **Risk: Text path rendering differs between browser and export.** Mitigation: put path geometry and text-fit helpers in `packages/customization`, then test shared fixtures before wiring admin/storefront/backend.
- **Risk: Replacing the contract touches all customization surfaces.** Mitigation: migrate the shared package first, then update admin, storefront, and backend in sequence with focused builds.
- **Risk: Existing draft templates in local D1 no longer match the new contract.** Mitigation: dev-mode implementation may clear or replace local draft data; do not preserve deprecated paths unless explicitly requested.
- **Risk: Shape clipping support differs by renderer.** Mitigation: represent shapes as shared semantic shape types and centralize clip-path/path generation helpers.
- **Risk: Silent text trimming can hide shopper input.** Mitigation: keep live preview immediate and deterministic so the visible result is the source of truth.

## Migration Plan

1. Replace shared customization types and fixtures with the editor model.
2. Update shared validation, form value normalization, text fitting, crop, and layer derivation helpers.
3. Update backend template persistence/API payloads to read and write the new model.
4. Rebuild the admin customization page around the editor UI.
5. Update storefront shopper customization to render fields from `formFields` and layers from `layers`.
6. Update backend validation/export paths to derive production layers from the new contract.
7. Re-run package, admin, storefront, backend, and root verification.

Rollback is a code rollback during dev mode. No production data migration is required in this change.

## Open Questions

None for v1. Production-grade font outlines and final manufacturing export details remain part of the broader customization production work, not this editor model change.
