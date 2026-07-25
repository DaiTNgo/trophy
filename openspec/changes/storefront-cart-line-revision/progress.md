# Progress

## Current State

- Storefront Cart Line Revision implementation is complete pending the repository-wide `./init.sh` gate.
- Customizable cart lines now expose `Review & edit`, which opens the generic PDP route with a `cartLine` reference only. The product redirect preserves that query reference.
- After browser-cart hydration, PDP restores the referenced line's variant and customization values, starts quantity at one, leaves normal controls available, and displays a fallback notice if the source is missing.
- Restored variants missing from the current product block adding until the shopper selects a current variant. Current customization validation continues to block invalid required values.
- Restored PDP sessions use a transient force-separate cart add mode; resulting Cart Lines have no persisted revision/source metadata and ordinary cart additions keep their existing merge behavior.
- Storefront TypeScript configuration no longer uses the TypeScript 7-removed `baseUrl` option, allowing the required storefront typecheck to run.

## Verification

- `openspec validate storefront-cart-line-revision --strict` passed before implementation.
- `pnpm --filter router-cf test` passed: 3 files, 16 tests.
- `pnpm --filter router-cf typecheck` passed.
- `pnpm --filter router-cf build` passed.
- `git diff --check` passed.
- `./init.sh` ran on 2026-07-25. Backend check, test (103 tests), and build passed. It stopped at the admin build on pre-existing TypeScript failures in `apps/admin/src/lib/auth-client.ts`, the already-dirty `apps/admin/src/pages/product-customization-editor.tsx`, and existing backend source imported by the admin project. The storefront build stage was not reached by the script.

## Next Step

- Resolve the unrelated admin TypeScript baseline failures, then rerun `./init.sh` and mark task 4.4 complete.

## Blockers

- Repository-wide verification is blocked by unrelated admin build failures; storefront-local verification passes.
