## Why

Admin currently uploads media through separate requests before creating a product, so the backend lacks Product and Variant IDs when it receives the file. That prevents direct writes to final semantic R2 paths and leaves orphaned staging assets when creation is abandoned or fails.

## What Changes

- **BREAKING** Replace the JSON-only admin product `full-create` request with one typed multipart request containing product data and mapped media files.
- Create Product and Variant IDs internally, then write each accepted file directly to its final R2 namespace before attaching media records.
- Compensate D1 and R2 writes on any failure so the API never exposes a partially created product.
- Preserve the admin one-action Save Draft/Publish workflow and retain selected browser files for resubmission after an error.

## Capabilities

### New Capabilities

- `multipart-product-full-create`: Create an entire product, variants, and their mapped media in one multipart command with final object ownership and failure compensation.

### Modified Capabilities

- None.

## Impact

- `apps/backend`: product full-create parsing, validation, R2 persistence/compensation, response contract, and route tests.
- `apps/admin`: typed multipart full-create client and create-product submit flow.
- `semantic-r2-media-ownership`: consumes the final product/variant media paths produced by this change.
