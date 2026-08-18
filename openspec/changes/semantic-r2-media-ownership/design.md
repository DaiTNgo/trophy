## Context

The backend stores media in one R2 binding and records object keys in D1. Current product keys are uploader-based, shopper uploads are token-based, and clipart uses an asset directory per object. Product media upload can occur before a product exists, checkout snapshots URLs rather than copying all required media, and no scheduled Worker handler exists. The prior unimplemented `storefront-upload-asset-retention` change proposes a conflicting 14-day retained-reference model; this change supersedes that unimplemented approach.

## Goals / Non-Goals

**Goals:**
- Make new R2 object paths understandable in the Cloudflare dashboard without encoding personal data.
- Preserve reproducible custom-order media independently from later catalog and clipart changes.
- Allow checkout to succeed when an asynchronous media copy fails, with an operator recovery path.
- Bound abandoned shopper-upload storage and reconcile both R2 and D1.

**Non-Goals:**
- Migrate legacy R2 objects or maintain dual path derivation; stored legacy keys remain readable.
- Change Customization Template asset storage.
- Copy Brand Font binaries per order or guarantee historic font rendering after a font is removed.
- Introduce server-side carts, payment processing, image transcoding, or an R2 public bucket.

## Decisions

### Use owner-oriented, flat-per-field key layouts

New keys expose a stable business owner and group files with the same purpose:

```txt
shopper-drafts/{draft-id}/uploads/{field-id}/{asset-id}.source.{ext}
orders/{order-number}-{order-id}/items/{item-id}/background/{asset-id}.source.{ext}
orders/{order-number}-{order-id}/items/{item-id}/uploads/{field-id}/{asset-id}.source.{ext}
orders/{order-number}-{order-id}/items/{item-id}/clipart/{field-id}/{source-asset-id}.source.{ext}
catalog/products/{product-id}/media/{asset-id}.source.{ext}
catalog/products/{product-id}/variants/{variant-id}/media/{asset-id}.source.{ext}
catalog/products/{product-id}/variants/{variant-id}/customization-background/{asset-id}.source.{ext}
```

An optional `.preview.png` peer is used only where a preview rendition exists. UUID asset IDs avoid collisions; field and owner prefixes make R2 debugging practical. Names, phones, and shopper-entered text are never placed in keys. One UUID directory per object was rejected because it fragments dashboard browsing.

### Depend on multipart product creation for final catalog ownership

The separate `multipart-product-full-create` change owns the one-call admin command that creates Product/Variant IDs and writes catalog media to final semantic paths. This change consumes those final objects for catalog ownership, deletion, and order snapshots; it does not define the create-product transport contract or its compensation behavior.

Product Reference Media stores an explicit association to either a product-owned media asset or a variant-owned media asset. A selected thumbnail is an explicit association, not the first gallery item. Deleting an asset removes its gallery reference and clears the thumbnail when it referenced that asset.

### Transfer only immutable inputs required by customized order items

After order and order-item IDs exist, a customized item copies its selected variant customization background, shopper-uploaded assets, and selected clipart into its own order namespace. It also rewrites the stored customization/background snapshot to order-owned URLs and records each transferred asset by item, field, source asset, source key, target key, and status. Non-customized items copy no catalog media.

Copying all catalog media is rejected because it adds storage without helping production. Referencing catalog assets is rejected because asset replacement or permanent product deletion changes historic order rendering. Brand fonts remain shared: snapshot their font family ID and display name, and render an operator-visible unavailable-font state if the file no longer exists.

### Make media transfer retryable without rejecting checkout

Order creation writes the order even if a required transfer fails. A per-order-item transfer record/state distinguishes `pending`, `complete`, and `failed`, records a non-sensitive error, and drives an admin warning plus retry action. The retry operation must be idempotent: a target object that already exists is treated as copied after metadata verification.

The shopper-draft source rows referenced by a pending or failed transfer are protected from expiry until transfer completes or the order is permanently deleted. Rejecting checkout was rejected because it can lose a sale for a recoverable storage failure.

### Reconcile abandoned shopper drafts on a daily scheduled Worker event

New shopper draft records carry an explicit ownership/lifecycle state and an expiry exactly seven days after upload. A daily scheduled handler selects bounded batches of expiry-eligible, unprotected draft media; it deletes source and preview objects idempotently, then deletes D1 records. R2 lifecycle rules may delete the `shopper-drafts/` prefix, but the Worker remains responsible for D1 reconciliation and retry safety.

### Delete owned prefixes during permanent deletion

Permanent product deletion removes associated catalog asset rows and `catalog/products/{product-id}/` objects. Permanent order deletion removes transfer records, order-owned media rows, and the complete order prefix. It never removes shared brand fonts or legacy objects unrelated to the deleted owner. Current product permanent deletion leaves product assets/R2 objects orphaned and must be corrected.

## Risks / Trade-offs

- [R2 and D1 cannot be committed atomically] -> Track transfer state and source/target keys, make copy/delete actions idempotent, and expose retry in admin.
- [A failed transfer protects shopper data beyond seven days] -> Protection ends on successful transfer or permanent order deletion; admin sees failures to resolve them.
- [Product creation writes D1 before R2] -> On any failed upload/association, compensate by deleting newly created records and written final objects; record cleanup failures for scheduled reconciliation.
- [Permanent deletion has historical order references] -> Preserve immutable order snapshots/media; do not rely on catalog records to render an order.
- [Legacy keys remain mixed with new keys] -> Always read the persisted key; derive new keys only at new-write boundaries.
- [Direct API clients upload PDF catalog assets] -> Preserve backend PDF acceptance even though admin converts PDFs to WebP.

## Migration Plan

1. Add D1 ownership/lifecycle/transfer records and key-building helpers, with legacy records excluded from new lifecycle selection.
2. Deploy product-draft-first and new upload paths before changing product/order deletion.
3. Deploy custom order copy/retry and admin recovery UI; then enable the daily scheduled cleanup trigger.
4. Verify R2 prefixes, retry behavior, permanent deletion, and legacy-key reads in staging.
5. Roll back by disabling new writes and cron; existing stored object keys remain the authoritative read path. Do not migrate or delete legacy objects as part of rollout.

## Open Questions

None.
