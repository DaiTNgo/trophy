## 1. Staged media readiness

- [x] 1.1 Add focused client-side tests for complete, incomplete, mismatched,
      and repair-canvas-mismatched staged Customization Media.
- [x] 1.2 Extract or extend a pure readiness helper that derives shared canvas
      dimensions and editor availability from affected variants and staged files.

## 2. Product Detail setup workflow

- [x] 2.1 Replace the combined setup/repair media list with a `Custom media`
      table containing Variant and Custom media columns plus choose, replace, and
      remove controls.
- [x] 2.2 Add `Custom media` and `Custom editor` tabs, select media by default,
      and disable the editor trigger until staged media readiness succeeds.
- [x] 2.3 Return to the media tab and disable the editor when a later staging
      change invalidates readiness.
- [x] 2.4 Render the enabled editor at the Create Product customization
      workspace dimensions while retaining the existing atomic activation/repair
      submit validation.

## 3. Verification and evidence

- [x] 3.1 Run focused admin tests and `pnpm --filter admin build`.
- [x] 3.2 Run `./init.sh`, then record verification evidence and restart notes
  in this change's `progress.md` and `session-handoff.md`.
