# Semantic R2 Media Ownership

Shopper-uploaded customization media belongs to a Shopper Customization Draft before checkout and to an Order Customization Snapshot after order creation. Unconverted draft media is retained for seven days, then removed from R2 and its D1 asset record; order snapshot media is not subject to that draft retention rule. R2 lifecycle expiry handles the `shopper-drafts/` prefix, while a scheduled Worker cleanup reconciles the corresponding D1 records.

R2 keys expose the shared business context without a folder per asset: `shopper-drafts/{draft-id}/uploads/{field-id}/{asset-id}.source.{ext}` before checkout and `orders/{order-number}-{order-id}/items/{order-item-id}/uploads/{field-id}/{asset-id}.source.{ext}` after checkout, with an optional `.preview.png` peer. This keeps all uploads for one customization field visible together in the R2 dashboard while retaining an immutable asset identity and the separate source/preview renditions.

Catalog media follows the same ownership rule: a product-specific upload is stored under `catalog/products/{product-id}/media/{asset-id}.source.{ext}`, while a variant-owned upload is stored under `catalog/products/{product-id}/variants/{variant-id}/media/{asset-id}.source.{ext}`. Product Reference Media can reference either asset type and never copies a variant object into a product path.

A Product Draft is a persisted product with `status = draft`, not a temporary upload session. It receives its product ID before media upload and uses the same `catalog/products/{product-id}/` R2 namespace as a published product; publishing never moves its media objects.

Product Draft media has no automatic retention period. It is removed only through an explicit operator deletion of the asset or product; the seven-day retention policy applies only to shopper drafts.

The backend continues to accept PDF catalog assets for direct API clients. The admin product flows convert PDF input to WebP before upload, so their normal R2 objects are raster media.

Deleting an asset removes any Product Reference Media entry that references it. If that entry was the explicitly selected Product Thumbnail, the thumbnail is cleared rather than replaced by another gallery item.

Permanently deleting a product removes its catalog records, product-specific and variant-owned catalog assets, and every R2 object under `catalog/products/{product-id}/`. It never removes shopper-uploaded order snapshot media under `orders/`.

At checkout, only an Order Item with a customization snapshot copies media into `orders/{order-number}-{order-id}/items/{order-item-id}/`: its selected variant Customization Background is copied from `catalog/products/{product-id}/variants/{variant-id}/customization-background/`, while its shopper uploads use `uploads/{field-id}/{asset-id}.source.{ext}` and selected clipart uses `clipart/{field-id}/{source-asset-id}.source.{ext}`. A non-customized order item copies no catalog or variant media. The Order Customization Snapshot references these order-owned copies, so later catalog media replacement, permanent product deletion, or clipart library cleanup cannot alter a purchased design.

Order snapshots do not copy Brand Font TTF files. They retain the selected font family ID and display name, then load the shared Brand Font when available; an unavailable font is reported to the operator without invalidating the order record.

Order-owned media has no time-based retention policy. It remains in `orders/` until the associated order is permanently deleted, at which point the order records and its complete R2 prefix are deleted together.

An Order Media Transfer failure does not reject checkout. The order is created with a retryable, per-item transfer error that is visible to admin so an operator can repair the required media without losing the sale.

Shopper-draft source media attached to an order with an incomplete transfer is exempt from the seven-day draft retention policy. It is retained until the transfer succeeds or the associated order is permanently deleted.

This layout refactor excludes Customization Template assets. Their existing upload flow and R2 keys remain unchanged; the semantic ownership work is limited to shopper/order media, catalog media, clipart, and brand fonts.

Existing objects and their D1 keys are not migrated. The new layout applies only to newly uploaded media; old records remain readable through their stored keys until they are explicitly deleted.
