# Session Handoff

The order detail customization preview now has an `Export PDF` action beside `Download uploads`. It exports the currently rendered frozen snapshot through `apps/admin/src/lib/pdf-export.ts` and reports failures inline in the modal.

Verification completed: `git diff --check`, `pnpm --filter admin build`, and `./init.sh`.
