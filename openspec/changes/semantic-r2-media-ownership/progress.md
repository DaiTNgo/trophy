# Progress

## 2026-08-07

- Proposal, design, three capability specs, and implementation tasks are complete.
- `openspec validate semantic-r2-media-ownership --strict` passes.
- No application code, schema, migration, Cloudflare configuration, or tests were changed in this proposal session.
- The change supersedes the unimplemented retention assumptions in `storefront-upload-asset-retention`: seven-day shopper-draft expiry, order-owned copies, and retryable transfer failures are the new contract.

## Implementation Checkpoint

- Completed tasks 1.1 through 1.4: added lifecycle and transfer schema tables, semantic R2 key helpers, and unit coverage. Targeted backend test and `pnpm --filter backend check` pass.
- The create-product transport/compensation work was split into the independent `multipart-product-full-create` change. This change now consumes its final catalog paths.
- Storefront uploads now require a session-scoped shopper draft ID and form-field ID, write under `shopper-drafts/{draft-id}/uploads/{field-id}/`, and record `shopper_draft` ownership with a seven-day expiry. Checkout validation of those references remains part of the pending order-transfer work.
- Completed 3.1, 4.3, and 4.4: the backend can extract the selected background/upload/clipart inputs for a custom item; bounded expired-draft cleanup deletes source/preview keys then D1 metadata and records R2 failures for retry. The existing 15-minute Worker cron dispatches this cleanup alongside the established cleanup jobs, satisfying the at-least-daily requirement.
- Targeted backend tests, backend typecheck, and backend build pass after this checkpoint (203 tests).
- No D1 migration was created, per repository dev-mode instruction. The new ownership fields and cleanup error field require schema deployment before production rollout.

## Next Step

Implement order media copy/retry (tasks 3.2-3.5) and checkout-time shopper-upload availability checks. Implement `multipart-product-full-create` before resuming catalog-media integration task 2.1.
