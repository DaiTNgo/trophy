## Context

The Admin `POST /api/admin/products/full-create` route persists a Product, its ordered variants, their uploaded Variant Media, and optional Customization Backgrounds in one workflow. The Product model supports `thumbnailAssetId`, and Product Detail can later select an existing variant-owned asset as its thumbnail. Full create currently leaves this field unset.

The thumbnail must reuse an asset already uploaded for a created variant. It is representational metadata, not catalog-critical media, so a failure to assign it must not undo a successful Product creation.

## Goals / Non-Goals

**Goals:**

- Assign a deterministic initial thumbnail while creating either a draft or published Product.
- Reference an existing variant-owned asset without uploading or copying another R2 object.
- Preserve a successful full-create result when only thumbnail initialization fails.
- Cover the route contract and selection order with focused backend tests.

**Non-Goals:**

- Add a thumbnail selection control or request field to Create Product.
- Change the existing Product Detail thumbnail-management workflow.
- Recalculate thumbnails after creation or after later variant/media edits.
- Make product media mandatory or introduce a migration for existing Products.

## Decisions

### Derive the source from submitted variant order

After variant assets and their ownership links have been persisted, the route will inspect the submitted variants in their creation order. For each variant it will choose its Customization Background first, then the first submitted Variant Media. The first asset ID found becomes `thumbnailAssetId`.

This uses the client-submitted order that already defines creation and gallery order, rather than relying on a later database read order. It also matches the existing storefront preference for customization media before gallery media.

Alternative: use only the first created variant. Rejected because a later variant may have the only eligible asset.

Alternative: use the first gallery asset before a Customization Background. Rejected because the agreed product representation favors the customization canvas for a customizable variant.

### Persist a reference only

The route will update the new Product's `thumbnailAssetId` with the selected asset ID. It will not insert product media, generate a derivative, or write another R2 object. The normal asset lifecycle continues to clear the thumbnail if a referenced asset is later deleted or replaced.

Alternative: copy the selected file to product-owned media. Rejected because it duplicates R2 data and creates two ownership/lifecycle paths for the same visual asset.

### Make only thumbnail assignment best effort

The selected-reference update will run in a narrow error boundary after all required Product, variant, and media persistence succeeds. If it throws, the route logs the Product ID and selected asset ID, then returns the successfully created Product with no thumbnail. Failures in Product creation, media upload, asset persistence, or variant-media linking retain the existing full-create failure and cleanup behavior.

Alternative: let the error reach full-create's outer error handler. Rejected because it unnecessarily deletes an otherwise valid Product for non-essential presentation metadata.

## Risks / Trade-offs

- [A database failure can leave a new Product without a thumbnail] → The route logs enough context for investigation; operators can select a thumbnail in Product Detail.
- [Submitted and persisted variant ordering could diverge] → The source is selected from the same submitted sequence used to create variant/media rows, and tests cover cross-variant priority.
- [A later asset lifecycle operation can clear the thumbnail] → This is existing intentional behavior; creation does not introduce a dynamic fallback.

## Migration Plan

No migration or backfill is required. The rule applies only to Products created after deployment. Rollback consists of reverting the full-create initialization; existing referenced thumbnails remain valid Product metadata.

## Open Questions

None.
