## Context

Persisted Variant Media currently shares the Variant Details FocusModal and the generic product-asset upload route. This couples asset writes to unrelated detail edits, leaves upload timing unclear, and cannot provide atomic destructive cleanup. The established catalog ownership model requires newly uploaded variant assets to use final `catalog/products/{product-id}/variants/{variant-id}/` R2 keys.

## Goals / Non-Goals

**Goals:**
- Give every persisted variant a dedicated `Manage media` FocusModal from its row actions.
- Make Gallery Media upload, append, and removal immediate, server-confirmed commands.
- Make Customization Background replacement a single validated multipart command that preserves the current background on failure.
- Remove R2, D1, variant association, and clear Product Thumbnail consistently when Gallery Media is removed.
- Use exported Hono route types and `hc<AppType>()` for new admin media commands.

**Non-Goals:**
- Change product creation's multipart full-create flow.
- Add any product-level media gallery beyond a single thumbnail selection UI.
- Support shared Gallery Media assets across variants.
- Alter storefront carousel behavior beyond its existing use of gallery position.

## Decisions

### Separate media command surface from Variant Details

The variant row `More actions` menu opens a dedicated FocusModal. Variant Details no longer renders upload controls or submits media IDs. This makes Save Variant responsible only for commercial and option data, while media commands take effect immediately.

### Use final-path multipart commands for persisted variants

Add authenticated routes under the existing variant media route for Gallery Media upload, ordering, and deletion, plus Customization Background replacement. Upload/replace commands parse and validate files before R2 writes, create an asset ID server-side, write to the final variant R2 key, then insert D1 asset and association rows. The route returns the refreshed product item on success.

The generic `/api/admin/products/assets` route remains outside this change because it serves unrelated admin flows. New Variant Media Management code does not call it.

### Product Media is a thumbnail-selection surface

Replace the ordered `product_media` URL list with internal asset associations and nullable `products.thumbnailAssetId`. The thumbnail manager selects a Variant Gallery Media or Customization Background asset directly, or uploads one product-owned thumbnail to the final product namespace. Product Media is not a gallery and has no ordering. Storefront returns the selected asset URL or `null`, with no automatic fallback.

In development mode this replaces the old model directly, without a compatibility path or migration.

### Gallery Media has exclusive ownership and immediate lifecycle

Every Gallery Media asset belongs to exactly one variant. Multipart gallery upload appends accepted files in selected-file order. Reorder receives the complete ordered asset-ID list and atomically replaces positions. Delete validates the asset belongs to the target variant, removes its variant association, clears an affected Product Thumbnail, deletes the R2 object, and deletes the asset record.

This rejects reuse because immediate delete would otherwise destroy another variant's media. It also avoids a generic upload-then-attach sequence that can create orphaned assets.

### Customization Background is replace-only

The admin reads candidate dimensions locally before it submits a replacement. The backend independently inspects the bytes and compares dimensions with every other variant background. It writes the new final-key object and asset, swaps the association, then deletes the old object and asset. Any validation or write failure leaves the existing background unchanged. There is no delete action.

### Render server-confirmed state

The media modal updates its product state from successful command responses. It does not optimistically remove assets. Failed operations preserve the visible server-confirmed state and provide contextual retry actions.

## Risks / Trade-offs

- [A multi-step R2/D1 deletion can fail] → perform idempotent cleanup, return an explicit error, and log structured diagnostics for unreconciled object keys.
- [Client dimensions can be forged or unavailable] → client validation is usability only; the backend reads bytes and remains authoritative.
- [Product Thumbnail points at a changed asset] → clear the thumbnail in the delete/replacement command.
- [New command endpoints increase route surface] → keep all routes under the existing authenticated variant-media boundary and cover success, validation, not-found, reference cleanup, and R2 failure contracts.

## Migration Plan

1. Deploy backend command routes and API contract tests.
2. Deploy the typed admin client and dedicated FocusModal in the same release.
3. Remove media controls and deferred-upload code from Variant Details.
4. Roll back the admin UI with backend routes if needed; new asset records remain readable through their persisted keys.

## Open Questions

None.
