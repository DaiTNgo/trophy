# Session Handoff

- 2026-08-18: Product Detail's standalone editor now creates the same regular six-sided vector polygon as Create Product; its former `addPolygon` implementation mistakenly started freeform drawing.
- 2026-08-18: Preview dialog now offers `Export WebP` and `Export PNG`, powered by `apps/admin/src/lib/raster-export.ts`. The former PDF export remains available for the explicit vector/PDF workflow.
- 2026-08-18: The Admin Order Detail customization preview now exposes the same actions, exporting the immutable order snapshot rather than current catalog data.
- The export output is two times the intrinsic customization background dimensions, independent of dialog zoom/pan. Exporting external assets requires CORS-readable URLs; the utility reports a download error when an asset cannot be loaded.
- Before claiming the change fully verified, resolve the unrelated missing `onDrawShape` prop in `apps/admin/src/components/customization/customization-template-panels-feature.tsx`, then rerun admin build and `./init.sh`.
