# Custom Shapes Library — Design

## Problem

Admin operators currently limited to 6 built-in shapes (rectangle, circle, ellipse, rounded_rectangle, star, heart) for image shape layers. Need to support arbitrary custom shapes via SVG upload and polygon drawing.

## Data Model

New table `customization_shapes` in D1:

| Column | Type | Notes |
|---|---|---|
| `id` | text PK | |
| `name` | text | Display name |
| `svg_path_data` | text | `d` attribute of SVG `<path>`, normalized to 0-100 viewport |
| `type` | text | `"svg_upload"` \| `"polygon"` |
| `created_at` | text | ISO timestamp |

**Type changes** (`packages/customization/src/types.ts`):
- `ShapeType` gains `"custom_svg"`
- `ImageShapeEditorLayer.shape` adds optional `customShapeId: string` (set when type is `custom_svg`)
- New type `CustomShape { id, name, svgPathData, type }`

## Storage

`svgPathData` stored in normalized 0-100 coordinate space. At render time, coordinates are scaled by `widthPx` / `heightPx` of the layer's geometry.

## Rendering

| Context | Implementation |
|---|---|
| DOM (admin preview, storefront) | `clip-path: path('...')` — modern browsers support SVG paths in CSS clip-path |
| Server-side SVG export | `<clipPath><path d="..." /></clipPath>` inside the exported SVG |
| Server-side PDF export | pdf-lib's `SvgPath` parser applied to the embedded image |

## UI Components

- **ShapeLibraryDialog** — modal with 3 tabs: Upload SVG, Polygon Draw, Library Grid
- **PolygonDrawTool** — mini canvas with click-to-add vertices, drag to move, close path
- **useShapeLibrary** — hook for shape CRUD (list, create, delete)

## Blocks Panel Changes

Built-in shapes remain as-is. Add a "Custom" section below showing shapes from library with a "+" button to open the library dialog. Clicking a custom shape adds an image layer with `type: "custom_svg"` and `customShapeId`.

## API Routes (`/api/customizations/shapes`)

| Method | Path | Handler |
|---|---|---|
| `GET` | `/api/customizations/shapes` | List all custom shapes |
| `POST` | `/api/customizations/shapes` | Create shape |
| `DELETE` | `/api/customizations/shapes/:id` | Delete (check no template references it) |

## Validation

- SVG upload: must parse to find at least one `<path>` with non-empty `d`, max 5000 chars, reject external URLs/resources
- Polygon: minimum 3 vertices, max 100 vertices
- Delete: reject if any template revision `blocksJson` references the shape ID
