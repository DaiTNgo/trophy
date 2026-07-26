# storefront-upload-asset-retention — Progress

**Status:** Proposed; ready for implementation.

## Decisions recorded

- Shopper-uploaded customization assets are temporary for 14 days from upload.
- Browser carts remain local-only; revisiting a cart does not renew the expiry.
- Successful checkout retains the shopper uploads referenced by the accepted order snapshot.
- One daily Worker cron performs bounded, retry-safe cleanup of expired temporary uploads.

## Verification

- `openspec validate storefront-upload-asset-retention --strict` ✓

## Next step

Apply the change with `/opsx:apply` when implementation is authorized.
