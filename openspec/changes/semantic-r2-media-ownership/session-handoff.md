# Session Handoff

## Change

`semantic-r2-media-ownership` is apply-ready. Read `proposal.md`, `design.md`, all `specs/*/spec.md`, and `tasks.md` before implementation.

## Critical Decisions

- New object keys are semantic and are not applied retroactively to legacy objects.
- Custom order items copy only the required background, shopper upload, and clipart inputs; fonts remain shared references.
- Failed transfer creates the order and is retried by admin; referenced shopper source media is protected from expiry.
- Shopper drafts expire after seven days; product drafts and order media have no time-based expiry.
- Customization Template storage is explicitly out of scope.

## Current Code Gaps

- No backend scheduled Worker handler or cron trigger exists.
- Permanent product deletion removes associations but leaves `product_assets` and R2 objects orphaned.
- Checkout currently snapshots URLs rather than creating immutable order-owned copies.

## Dependency

The one-call multipart full-create contract is owned by `openspec/changes/multipart-product-full-create`. Implement that change before task 2.1 here; this change must not reintroduce staging paths or duplicate its compensation workflow.
