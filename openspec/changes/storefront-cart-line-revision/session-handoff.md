# Session Handoff

## Change

`storefront-cart-line-revision`

## Agreed Product Behavior

- Every customized cart line exposes a review-and-edit action, including a currently invalid line.
- The action returns to the ordinary PDP at page top and restores the cart line's variant and customization values; all PDP controls remain usable.
- Restoration survives refresh and new tabs through a Cart Line ID query reference backed by browser-cart storage. A missing source falls back to PDP defaults with a notice.
- Current product/template validation controls whether the revision can be added; incompatible data requires shopper correction and never changes the source line.
- A revision begins at quantity one and always adds as an independent Cart Line, even when unchanged. It has no persistent source relationship or cart label.
- After adding, the shopper stays on the PDP.

## Verification

- `pnpm --filter router-cf test` passed: 3 files, 16 tests.
- `pnpm --filter router-cf typecheck` passed.
- `pnpm --filter router-cf build` passed.
- `git diff --check` passed.
- `./init.sh` is still blocked at the unrelated admin TypeScript build failures described in `progress.md`; do not mark task 4.4 complete until it passes.

## Resume

1. Resolve the unrelated admin TypeScript baseline failures or wait for their owner.
2. Rerun `./init.sh`.
3. Mark task 4.4 complete only if the repository-wide harness passes, then archive the change.
