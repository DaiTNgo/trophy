## Context

The current create-product page uploads each selected file to `/api/admin/products/assets`, then sends their IDs in a JSON `/full-create` request. This supports individual retries but stores files before Product/Variant ownership exists. The new semantic R2 layout requires those IDs before any object write.

## Goals / Non-Goals

**Goals:**
- Keep one admin Save Draft/Publish action and one full-create API call.
- Create media directly at final product/variant R2 paths.
- Preserve existing product/options/variants/customization validation and publish rules.
- Return no partially created Product after failed full-create.

**Non-Goals:**
- Support resumable, independent catalog-media upload endpoints during product creation.
- Change product-detail media editing after a product already exists.
- Add server-side temporary object namespaces or migrate old product assets.

## Decisions

### Use multipart payload plus file-to-variant mapping

`POST /api/admin/products/full-create` receives `payload` as JSON and individual files in `multipart/form-data`. Payload media entries use a client-generated media ID; each matching multipart part uses that ID. The backend rejects missing, duplicate, unreferenced, oversized, or unsupported files before persistence.

Multipart is chosen over base64 JSON to preserve browser file streaming and avoid expansion. Separate pre-upload is rejected because it cannot write final variant keys without a later copy/move.

### Run a compensating creation workflow

The command validates all data first, creates product/options/variants in D1 with `draft` status to obtain IDs, writes R2 objects at their final semantic keys, inserts asset/media rows, then publishes only if requested and ready. On any post-create error it deletes inserted D1 records and successfully written R2 objects before returning an error. Cleanup failures are logged for later operational reconciliation.

D1 and R2 cannot share a transaction, so an atomic database transaction alone is insufficient. Retaining a partial Product Draft was rejected because the one-call contract requires all-or-nothing product creation.

### Keep client files available after failure

The create-product page must not clear pending `File` objects on failed submission. It displays the backend error and permits the operator to submit the same form again. A successful response alone transitions navigation/state.

## Risks / Trade-offs

- [Many files exceed Worker request limits] -> retain the existing 20 MB per-file validation and reject requests whose aggregate body cannot be processed; provide a clear error without creating a product.
- [Compensation deletion fails] -> log product ID and object keys; a future operator/cleanup process can remove leftovers.
- [Multipart mapping bugs attach files to the wrong variant] -> use client media IDs, validate one-to-one mapping, and cover it with route tests.
- [Existing JSON clients call full-create] -> this is an intentional breaking internal admin contract; update the only admin consumer in the same change.

## Migration Plan

1. Deploy the backend multipart parser and tests with the updated typed admin client.
2. Deploy the create-product page change in the same release so no active client sends the JSON-only body.
3. Keep existing product asset serving unchanged for legacy records; do not migrate them.
4. Roll back both client and route together if multipart failures occur.

## Open Questions

None.
