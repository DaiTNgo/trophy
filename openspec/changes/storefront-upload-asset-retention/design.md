## Context

Shopper product-detail uploads currently send the selected file directly to the storefront customization-asset endpoint. The endpoint stores the binary in `CUSTOMIZATION_ASSETS` (R2) and creates a `customization_assets` row in D1. Browser-cart lines contain the returned `assetId`, but the cart is local storage only: no server record identifies an abandoned or active cart.

An order snapshots customization values that can contain upload asset IDs. Assets are currently immutable and served by ID, but have no lifecycle state, expiry, or scheduled cleanup. Product media, clipart, fonts, and admin-managed assets use different ownership flows and are outside this change.

## Goals / Non-Goals

**Goals:**

- Retain each shopper-uploaded asset for 14 days after upload, giving a browser cart a reasonable return window.
- Preserve every shopper-uploaded asset referenced by a successfully created order.
- Make expired temporary assets unavailable to storefront consumers and remove their R2/D1 data through an idempotent scheduled cleanup.
- Give the storefront an actionable recovery state when a persisted cart references an expired or deleted upload.

**Non-Goals:**

- Introduce a server-side cart, cart synchronization, or a per-cart asset lease/heartbeat.
- Extend the 14-day deadline whenever a shopper revisits a cart or PDP.
- Delete, expire, or alter product media, clipart, fonts, admin uploads, production exports, or assets already managed by another ownership flow.
- Backfill lifecycle data for historic uploads; the cleanup applies only to assets created under the new shopper-upload policy.

## Decisions

### Represent retention explicitly on the customization-asset record

The asset record will distinguish temporary shopper uploads from retained uploads, with an expiry timestamp for the temporary state and a durable retained marker for checkout-owned assets. New storefront uploads begin as `temporary` with `expiresAt = createdAt + 14 days`. A successful order creation promotes only the shopper-upload asset IDs present in its accepted customization snapshots to `retained` and clears their expiry.

Explicit lifecycle columns make cleanup queryable in D1 without listing the R2 bucket or parsing order snapshot JSON during every cron run. They also allow the asset-serving route to reject expired temporary assets before the scheduled cleanup has run. Parsing all orders was rejected because order snapshots are immutable JSON, potentially numerous, and make expiration logic expensive and error-prone.

### Treat the 14-day window as a fixed, transparent browser-cart grace period

Because the cart exists only in browser local storage, the backend cannot know whether a temporary asset remains in an active cart. The expiry starts at upload and is not renewed when a cart is viewed. If the asset is expired, the storefront must show that the uploaded image is no longer available and require a replacement upload; it must not silently submit the stale asset ID.

Server-side carts or an asset-renewal endpoint were considered, but both create wider client/server state and abuse-control requirements than the current retention problem warrants. A fixed 14-day limit is predictable, bounded, and matches the agreed shopper expectation.

### Use one scheduled Worker cleanup path, backed by R2 lifecycle operations

The backend Worker will receive one daily cron trigger. It will select expired `temporary` shopper assets in bounded batches, delete original and preview R2 object keys when present, then delete the corresponding D1 record. The operation must tolerate a missing R2 object and safely retry after partial failure: if R2 deletion succeeds but D1 deletion does not, a later run removes the remaining metadata; if R2 deletion fails, the metadata remains for retry.

One job centralizes policy and avoids overlapping cleanup routines for “abandoned upload” and “unsubmitted cart.” R2 bucket lifecycle rules alone were rejected because they cannot coordinate D1 metadata deletion, protect retained order assets, or make expiry immediately observable through the public asset route.

### Preserve checkout artifacts before cleanup eligibility

Order creation already freezes the shopper customization snapshot. Promotion of its referenced upload assets is part of the successful order-create path, so a checked-out asset cannot remain eligible for temporary cleanup. The order route will only complete after the promotion is applied consistently with the order write; failures must not leave a successful order pointing solely to cleanup-eligible uploads.

This does not introduce a generic asset reference table. That model would be more flexible, but is unnecessary while the only permanent shopper reference is the order snapshot and would expand scope into catalog and admin asset ownership.

## Risks / Trade-offs

- [A shopper returns after 14 days without checkout] → Their upload is intentionally unavailable; display a replacement-upload prompt and block checkout until the current customization validates.
- [Cron is delayed or temporarily fails] → The asset-serving route enforces expiry independently; the next idempotent run reclaims storage and metadata.
- [R2 and D1 deletion partially succeeds] → Use object-key deletion as idempotent work and leave/retry metadata until cleanup completes.
- [An order creation fails during promotion] → Keep the asset temporary; do not report checkout success unless the order and retention state are made consistent.
- [Existing historic asset rows lack lifecycle fields] → Exclude them from this policy rather than risking deletion of records without explicit temporary ownership.
- [Large expiry backlog] → Use bounded batches per scheduled invocation and emit observability data for processed, deleted, and retry counts.

## Migration Plan

1. Add lifecycle fields and deploy the upload, asset-serving, and order-promotion behavior before enabling the cron trigger.
2. Enable the daily cron after new uploads receive explicit temporary lifecycle values.
3. Observe scheduled-run counts and expired-upload recovery behavior for one retention window.
4. Roll back by disabling the cron trigger; retained and temporary assets remain readable under the prior serving behavior, while existing data is not deleted retroactively.

## Open Questions

None. The retention window is fixed at 14 days, and this change intentionally does not introduce server-side cart state or renewal.
