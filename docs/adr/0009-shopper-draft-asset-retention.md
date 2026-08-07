# Shopper Draft Asset Retention

Shopper-uploaded customization media belongs to a Shopper Customization Draft before checkout and to an Order Customization Snapshot after order creation. Unconverted draft media is retained for seven days, then removed from R2 and its D1 asset record; order snapshot media is not subject to that draft retention rule. R2 lifecycle expiry handles the `shopper-drafts/` prefix, while a scheduled Worker cleanup reconciles the corresponding D1 records.

R2 keys expose the shared business context without a folder per asset: `shopper-drafts/{draft-id}/uploads/{field-id}/{asset-id}.source.{ext}` before checkout and `orders/{order-number}-{order-id}/items/{order-item-id}/uploads/{field-id}/{asset-id}.source.{ext}` after checkout, with an optional `.preview.png` peer. This keeps all uploads for one customization field visible together in the R2 dashboard while retaining an immutable asset identity and the separate source/preview renditions.

Catalog media follows the same ownership rule: a product-specific upload is stored under `catalog/products/{product-id}/media/{asset-id}.source.{ext}`, while a variant-owned upload is stored under `catalog/products/{product-id}/variants/{variant-id}/media/{asset-id}.source.{ext}`. Product Reference Media can reference either asset type and never copies a variant object into a product path.

A Product Draft is a persisted product with `status = draft`, not a temporary upload session. It receives its product ID before media upload and uses the same `catalog/products/{product-id}/` R2 namespace as a published product; publishing never moves its media objects.

Product Draft media has no automatic retention period. It is removed only through an explicit operator deletion of the asset or product; the seven-day retention policy applies only to shopper drafts.

The backend continues to accept PDF catalog assets for direct API clients. The admin product flows convert PDF input to WebP before upload, so their normal R2 objects are raster media.

Deleting an asset removes any Product Reference Media entry that references it. If that entry was the explicitly selected Product Thumbnail, the thumbnail is cleared rather than replaced by another gallery item.
