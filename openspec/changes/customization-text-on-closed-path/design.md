## Context

The customization editor now has a Figma-style workspace with Blocks, Layers, Form, Background, a central canvas, and an inspector. Text layers already support path rendering through shared SVG path helpers, but the custom path authoring model was previously oriented around Bezier points and open paths.

The approved UX for this change is narrower and more Figma-like for the cup use case: the left Blocks panel exposes a dedicated `Text on path` item that creates text around a closed circle/oval path. Admins edit the text content in the inspector and manipulate the path shape on the canvas through direct handles.

## Goals / Non-Goals

**Goals:**

- Add a dedicated `Text on path` block in the admin Blocks panel.
- Create Text on path layers as one-line closed ellipse/oval path text.
- Provide canvas controls for moving the layer, resizing the ellipse, setting text start angle, and flipping text orientation.
- Persist closed ellipse path data in the shared editor model.
- Render the same closed path behavior in admin editor, admin Preview, storefront preview, and backend export paths.
- Preserve existing text fitting behavior: shrink from max to min font size, then silently trim overflow.

**Non-Goals:**

- No open arc path in this change.
- No Pen tool, custom Bezier point editing, or freeform vector text path for v1.
- No direct text editing on the canvas.
- No multi-line text on path.
- No path-specific shopper controls.
- No new external rendering dependency.

## Decisions

### Use a dedicated closed ellipse path type

The shared text path model will add a closed ellipse representation instead of treating Text on path as a generic custom Bezier path. The path stores normalized ellipse bounds, a start angle, text side/orientation, and direction data needed to render deterministically.

This is preferred over Bezier points because the requested UX is not a Pen tool. It is a circle/oval text workflow where admins resize the path and rotate the text start position. The model should match that interaction directly.

### Create Text on path from the Blocks panel

The Blocks panel will include `Text` and `Text on path` as separate creation actions. `Text` creates a normal straight text layer. `Text on path` creates a text layer with the closed ellipse path selected and enters path editing state immediately.

This is clearer than creating a normal Text layer first and requiring admins to switch path modes in the inspector. It also matches editor patterns where text-on-path is a distinct creation tool.

### Keep text content inspector-only

Canvas text remains preview-only and non-editable. Text content, sample text, max/min font size, color, and alignment stay in the inspector. For closed path text, max lines is locked to `1`.

This preserves the approved editor rule and avoids selection/drag conflicts caused by browser text editing on the canvas.

### Use canvas handles for ellipse editing

Selected Text on path layers show an ellipse outline. Resize handles edit ellipse width and height. A start-position handle on the ellipse controls where text begins or anchors along the closed path. A flip/orientation action in the inspector toggles inside/outside placement or direction.

Layer dragging moves the whole ellipse and text together. Path handle dragging edits only the path state and does not change shopper text content.

### Resolve alignment along the closed path

Left, center, and right alignment are interpreted along the ellipse path, anchored by the start angle. Left starts text at the start angle, center centers text around that angle, and right ends text at that angle.

This keeps existing alignment semantics while making them path-aware.

## Risks / Trade-offs

- **Renderer differences across browser/export** -> Use shared path generation helpers in `packages/customization` and route admin, storefront, and backend through the same path data where practical.
- **SVG textPath support differs for closed paths** -> Generate stable SVG path data with a predictable start point and direction, and add tests for the path string and fitting behavior.
- **Text can exceed the closed path length** -> Reuse the existing shrink-then-trim policy so rendered output is deterministic and does not create shopper-facing warnings.
- **Handles can conflict with layer dragging** -> Gate pointer handlers so path handles stop propagation and normal layer movement is paused during path handle edits.
- **Existing custom Bezier code may overlap with this UX** -> Keep this change scoped to closed ellipse Text on path. Remove or hide Bezier-specific controls only if they conflict with the approved v1 flow.

## Migration Plan

1. Extend the shared text path model and validation with a closed ellipse path type.
2. Add shared SVG path generation and text fitting support for closed ellipse text paths.
3. Add the `Text on path` creation action and inspector behavior in the admin editor.
4. Add canvas ellipse outline, resize handles, start-position handle, and flip/orientation editing.
5. Update admin Preview, storefront rendering, and backend export rendering to support the closed ellipse path.
6. Add focused shared tests and run package/admin/storefront/backend verification.

Rollback is a code rollback. This change does not require a database migration in dev mode unless existing persisted local drafts must be rewritten manually.

## Open Questions

None for v1. The approved scope is closed ellipse/oval Text on path only.
