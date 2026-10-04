# PDF Print Coordinate Normalization

When a PDF background is uploaded for a customizable product, the system converts it to a scale-2.0 WebP image to ensure high-resolution preview rendering in the storefront and editor. However, the system extracts and stores the original, native PDF point dimensions (scale 1.0) as the `widthPx` and `heightPx` in the template background metadata, rather than the dimensions of the generated WebP image.

By applying the 2x image to a 1x CSS container in the browser (similar to Retina display behavior), the user's Editor Canvas Coordinates are naturally captured at scale 1.0. During vector PDF export, the exported document size precisely matches the original physical dimensions of the background PDF, allowing print operators to output true-to-size documents without manual scaling or math hacks.

## Considered Options

- Store dimensions based on the generated WebP (scale-2.0) and export a double-sized PDF. Rejected because the print operator would have to rely on the printer's "Fit to Page" setting, and printing at "Actual Size" would result in an oversized, unusable print.
- Store dimensions based on the generated WebP (scale-2.0) and divide all coordinates by 2 during export. Rejected because it adds unnecessary complexity to the coordinate mathematics and pollutes the database with display-dependent values.
- Handle at import (Accepted). We store scale-1.0 coordinates and accept that older templates (which stored scale-2.0 dimensions) will break, prioritizing a clean architecture moving forward without backward-compatibility bloat.
