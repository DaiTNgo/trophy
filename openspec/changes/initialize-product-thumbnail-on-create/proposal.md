## Why

Products created in Admin can already own Variant Media and Customization Backgrounds, but their product thumbnail is left unset. This makes a newly created product appear without a representative image until an operator manually visits Product Detail, even when a suitable variant asset already exists.

## What Changes

- Initialize a Product Thumbnail during the Admin full-create workflow by referencing an already-uploaded asset from a created variant.
- Select the first eligible asset by created-variant order: prefer each variant's Customization Background, then its first Variant Media in gallery order.
- Leave the thumbnail empty when no created variant has eligible media, and do not re-evaluate it after creation.
- Treat thumbnail initialization as best effort: a failure is logged server-side but does not fail an otherwise successful product creation.

## Capabilities

### New Capabilities
- `initial-product-thumbnail`: Initializes a product's thumbnail from eligible variant-owned media at creation time.

### Modified Capabilities
- None.

## Impact

- Backend full-create command in `apps/backend/src/routes/admin/product-command-route.ts`.
- Backend admin product route contract tests.
- No new API path, client request field, R2 object, migration, or Product Detail UI is required.
