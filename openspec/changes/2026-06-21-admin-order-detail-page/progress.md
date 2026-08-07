# Progress

- Added `Export PDF` to the admin order customization preview modal.
- The export rebuilds the design from the frozen order customization snapshot and reuses the existing vector PDF exporter.
- Exported files use the order number and item id in the filename.
- Verification: `git diff --check`, `pnpm --filter admin build`, and `./init.sh` pass.
