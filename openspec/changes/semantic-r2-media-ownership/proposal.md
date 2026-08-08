## Why

R2 object keys currently encode uploader IDs and one UUID directory per asset, which makes Cloudflare debugging difficult and leaves catalog objects orphaned after permanent product deletion. Customized orders also reference mutable catalog, shopper-upload, and clipart media, so later cleanup or replacement can make a purchased design unavailable or incorrect.

## What Changes

- Introduce semantic, ownership-based R2 keys for newly uploaded shopper, order, catalog, clipart, and brand-font media; existing objects remain on their stored legacy keys.
- Consume final product/variant media namespaces from the separate `multipart-product-full-create` change.
- Model Product Reference Media as either a product-owned upload or a reference to variant-owned media; clear an explicitly selected thumbnail if its referenced asset is removed.
- Copy only the required media for customized order items into an immutable order namespace: selected customization background, shopper uploads, and selected clipart.
- Add retryable per-item order-media transfer state so checkout succeeds even when copying required media fails; protect its shopper-draft sources until transfer succeeds or the order is permanently deleted.
- Add a seven-day lifecycle for abandoned shopper drafts and a scheduled reconciliation job for R2/D1 cleanup.
- Make permanent product and order deletion remove their owned R2 prefixes and asset records. Brand fonts remain shared references and report an unavailable-font state rather than being copied.
- Keep Customization Template asset storage out of scope.

## Capabilities

### New Capabilities

- `semantic-r2-media-ownership`: Own semantic R2 namespaces, catalog media ownership, deletion behavior, and backward-compatible legacy-key reads.
- `order-customization-media-transfer`: Preserve immutable custom-order inputs through copy, retry, source protection, and order deletion.
- `shopper-draft-asset-lifecycle`: Expire and reconcile abandoned shopper uploads without affecting order-bound media.

### Modified Capabilities

- None.

## Impact

- `apps/backend`: D1 schema, upload routes, product/order lifecycle routes, R2 helpers, scheduled Worker handler, and route/service tests.
- `apps/backend/wrangler.jsonc`: daily cron trigger and R2 lifecycle configuration where applicable.
- `apps/admin`: operator-visible order-media transfer errors/retry actions.
- `apps/storefront`: upload/checkout handling for shopper drafts and a successful checkout response that may contain a media-transfer warning.
- Cloudflare R2/D1: new-object key hierarchy and cleanup operations; existing object keys are not migrated.
