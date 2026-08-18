# Progress

## 2026-08-07

- Replaced the JSON-only `POST /api/admin/products/full-create` contract with multipart `payload` JSON plus one file part per client media ID.
- Server validates mapping, MIME type, size, and dimensions before creating product records. It creates product/variant IDs first, writes files directly to final catalog R2 keys, then persists asset and media associations.
- Post-create failures compensate the product graph and all successfully written objects. Cleanup failures emit structured diagnostics containing the product ID and object keys.
- The admin now sends `FormData` and keeps the form's pending `File` instances intact on an error for retry.

## Verification

- `pnpm --filter backend check`
- `pnpm --filter backend test` (26 files, 163 tests)
- `pnpm --filter backend build`
- `pnpm --filter admin test` (5 files, 16 tests)
- `pnpm --filter admin build`
- `./init.sh`

## Residual Risk

- Multipart parser tests cover valid and invalid mappings; existing semantic R2-key and publish helper tests cover the derived paths and publish rules. The current route mock harness does not inject a full R2/D1 failure sequence, so compensation is verified by focused implementation review and the normal suite rather than an end-to-end failure-injection route test.

## Follow-up Fix

- Fixed the create-form's existing `pending_<uuid>` multipart correlation tokens. The parser now accepts safe correlation tokens and generates a separate canonical UUID for each persisted product asset, preserving valid asset-content URLs and R2 keys. Regression coverage uses the exact pending-token shape; `./init.sh` passed again after the fix.
