## 1. Data Model and R2 Key Foundation

- [x] 1.1 Add explicit D1 ownership/lifecycle fields for new shopper-draft assets, including seven-day expiry and transfer-protection state; exclude legacy rows from lifecycle selection.
- [x] 1.2 Add D1 records for per-customized-order-item media transfer status, source/target keys, field ownership, copied asset role, and retryable failure details.
- [x] 1.3 Add shared, validated R2 key builders for shopper drafts, orders, product-owned media, variant media, customization backgrounds, clipart, and brand fonts without including shopper PII.
- [x] 1.4 Add backend unit tests for all new key builders and lifecycle/transfer state transitions.

## 2. Catalog Media Ownership

- [ ] 2.1 Integrate catalog ownership, media reads, and lifecycle behavior with final Product/Variant media paths produced by `multipart-product-full-create`.
- [ ] 2.3 Replace URL-only Product Reference Media persistence with explicit product-owned or variant-owned asset references, ordered gallery positions, and an explicit thumbnail selection.
- [ ] 2.4 Update admin product media flows to upload product-owned media separately and select variant-owned media into the product gallery without copying R2 objects.
- [ ] 2.5 Clear Product Thumbnail and dependent Product Reference Media associations when their underlying asset is removed.
- [ ] 2.6 Update permanent product deletion to remove all catalog asset records and the complete `catalog/products/{product-id}/` R2 prefix without removing order-owned media.
- [ ] 2.7 Add backend route/service contract tests for draft-first upload, product/variant ownership, gallery references, thumbnail clearing, legacy reads, and permanent deletion.

## 3. Immutable Customized Order Media

- [x] 3.1 Extract all required media references from an accepted customization snapshot: selected variant background, shopper uploads, and selected clipart.
- [ ] 3.2 Copy the required media for customized items into semantic order paths, update the order snapshot to order-owned URLs, and leave non-customized items without copied media.
- [ ] 3.3 Snapshot dynamic font family IDs with display names without copying Brand Font binaries, and return an operator-visible unavailable-font state when shared files are missing.
- [ ] 3.4 Persist transfer progress and failures per order item; make repeated copy/retry operations idempotent.
- [ ] 3.5 Add an authorized admin Hono RPC action to inspect and retry failed item media transfers, including clear failure responses.
- [ ] 3.6 Update admin order detail to surface media-transfer warnings and provide a retry control without treating the sale as invalid.
- [ ] 3.7 Add permanent order deletion that removes its transfer records and complete `orders/{order-number}-{order-id}/` R2 prefix.
- [ ] 3.8 Add backend API/service tests for successful copies, catalog/clipart deletion after copy, failed checkout copy with created-order warning, retry success, font-unavailable reporting, and permanent order deletion.

## 4. Shopper Draft Lifecycle and Scheduled Reconciliation

- [ ] 4.1 Update storefront customization uploads to create seven-day shopper-draft records under semantic draft paths and reject/repair unavailable expired uploads before checkout.
- [ ] 4.2 Protect shopper-draft sources attached to pending or failed order transfers; release/delete those sources after successful transfer according to the finalized cleanup policy.
- [x] 4.3 Add a bounded, idempotent scheduled cleanup service that reconciles expired, unprotected shopper-draft R2 objects and D1 records, including partial-deletion retries and observability.
- [x] 4.4 Add the Worker `scheduled()` handler and daily `triggers.crons` configuration without changing Customization Template asset behavior.
- [ ] 4.5 Add backend tests for seven-day expiry, protection, retry-safe cleanup, R2 deletion failure, and scheduled-handler dispatch.
- [ ] 4.6 Add storefront tests for expired-upload recovery and successful checkout responses carrying a media-transfer warning.

## 5. Verification and Change Evidence

- [ ] 5.1 Verify Hono RPC contracts for all changed backend routes and update admin/storefront typed clients without new handwritten fetch wrappers.
- [ ] 5.2 Run `pnpm --filter backend test`, `pnpm --filter backend check`, `pnpm --filter backend build`, `pnpm --filter admin build`, `pnpm --filter router-cf typecheck`, `pnpm --filter router-cf build`, and `./init.sh`.
- [ ] 5.3 Record Cloudflare deployment prerequisites, cron/lifecycle configuration, verification evidence, and residual R2/D1 consistency risks in this change's `progress.md` and `session-handoff.md`.
