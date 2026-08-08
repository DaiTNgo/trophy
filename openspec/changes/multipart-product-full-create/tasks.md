## 1. Multipart Contract

- [x] 1.1 Define typed multipart full-create payload/media mapping schemas and shared validation helpers.
- [x] 1.2 Update the backend full-create route to parse multipart payload/files and reject invalid mapping, MIME, dimension, and size inputs before persistence.
- [x] 1.3 Update the admin typed full-create client to submit `FormData` with payload JSON and mapped media files.

## 2. Final Media Persistence

- [x] 2.1 Create Product, options, and Variant IDs internally before writing media objects to final product/variant R2 paths.
- [x] 2.2 Persist product asset rows and variant media/customization-media associations only after their final R2 writes succeed.
- [x] 2.3 Preserve current draft/publish validation, MISA synchronization, and response shapes where compatible with multipart input.

## 3. Failure Compensation and Admin Recovery

- [x] 3.1 Implement idempotent compensation that removes newly created D1 product records and successfully written R2 objects after a post-validation failure.
- [x] 3.2 Record structured cleanup diagnostics for any object that compensation cannot remove.
- [x] 3.3 Keep create-product form values and pending `File` objects after failure, showing an actionable retry error.

## 4. Verification and Evidence

- [x] 4.1 Add backend route tests for valid multipart creation, invalid file mapping, final semantic keys, publish behavior, and R2/D1 compensation.
- [x] 4.2 Add admin client/helper tests for multipart mapping and retry-preserved files.
- [x] 4.3 Run backend test/check/build, admin build, and `./init.sh`.
- [x] 4.4 Record verification and deployment notes in this change's `progress.md` and `session-handoff.md`.
