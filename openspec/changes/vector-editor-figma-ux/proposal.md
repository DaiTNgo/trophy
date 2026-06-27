## Why

The current vector drawing tool relies exclusively on the Pen Tool (click to add corners, drag for bezier curves). This is notoriously difficult for non-designers to use when trying to trace a background cup image. To improve UX, we need a Figma-like "Polygon to Edit" workflow where users can instantly drop a primitive shape, scale/rotate it using a bounding box, double-click to edit nodes, hover edges to add points, and adjust corner radiuses for smooth tracing.

## What Changes

- Add a "Polygon" (or Rectangle) quick-start tool to generate a primitive vector path instantly.
- Enable `ResizeHandles` for vector shapes so they can be scaled and rotated via a bounding box before entering Node Edit mode.
- Implement Hover-to-Add-Point on path edges during Node Edit mode.
- Add Corner Radius (`cornerRadius`) property to `VectorPoint` to easily round off sharp corners without manually adjusting bezier handles.
- Render SVG paths with rounded corners based on the `cornerRadius` value.

## Capabilities

### New Capabilities
- `vector-editor-ux`: Enhanced Figma-like UX for vector editing, including bounding box transforms, hover-to-add-point, and corner radius.

### Modified Capabilities
- `cup-customization-production`: Modifying the capabilities of the customization template editor to support vector drawing UX improvements and new properties on `VectorPoint`.

## Impact

- `packages/customization/src/types.ts`: Update `VectorPoint` type.
- `packages/customization/src/geometry.ts`: Update SVG path generation to support `cornerRadius`.
- `apps/admin/src/components/customization/customization-template-editor.tsx`: Update canvas interaction logic (ResizeHandles, hover detection, point addition).
- `apps/admin/src/components/customization/customization-template-inspector.tsx`: Add Corner Radius input.
