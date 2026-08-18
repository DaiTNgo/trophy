## Why

Variant media is currently edited inside the general Variant Details modal, where upload state and destructive asset lifecycle are coupled to an unrelated Save action. Operators need immediate, explicit media operations with reliable asset cleanup and no ambiguity about what Cancel affects.

## What Changes

- Add `More actions > Manage media` for each persisted product variant, opening a dedicated admin FocusModal; remove media fields from Variant Details.
- Add immediate commands to upload, append, and permanently remove variant Gallery Media.
- Add an atomic multipart command to replace a variant Customization Background after client-side and authoritative server-side dimension validation.
- Make Product Media a thumbnail-selection surface that supports a product-owned thumbnail upload or direct selection from Variant Media or Customization Background.
- Keep Product Thumbnail explicit, and clear it when its source Variant Media is removed or its Customization Background is replaced.
- Preserve server-confirmed media state on command failure and expose retryable errors in the media manager.

## Capabilities

### New Capabilities
- `variant-media-management`: Independent operator management of persisted Variant Gallery Media and Customization Background assets.

### Modified Capabilities
- None.

## Impact

- `apps/admin`: variants-list action, dedicated FocusModal, immediate media commands, and error/retry states.
- `apps/backend`: Product Thumbnail model, authenticated multipart upload/replace and delete routes, R2 and D1 asset lifecycle.
- `CONTEXT.md` and ADR `0012-variant-media-management-is-independent.md`: established domain terminology and decision record.
