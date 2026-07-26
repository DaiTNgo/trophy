# Session Handoff — storefront-upload-asset-retention

## State

The OpenSpec change is proposal-complete and has not been implemented.

## Key constraints

- Do not introduce a server-side cart or an asset-renewal heartbeat.
- Do not apply shopper retention cleanup to catalog media, clipart, fonts, admin uploads, or production exports.
- A browser cart that returns after the fixed 14-day expiry must require an image replacement; it must not submit the stale asset ID.
- Cleanup must be idempotent across R2/D1 partial failures and must preserve uploads used by successful orders.

## Start here

Read `proposal.md`, `design.md`, `specs/shopper-customization-asset-retention/spec.md`, and `tasks.md`, then begin with task 1.1.
