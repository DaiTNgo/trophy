## 1. Product Thumbnail and Backend Media Commands

- [ ] 1.1 Replace the Product Media URL-list model with a product-owned thumbnail upload and nullable Product Thumbnail selector contract.
- [ ] 1.2 Define typed multipart upload/replace payloads and Hono RPC route contracts for persisted Variant Media Management.
- [ ] 1.3 Implement final-key Gallery Media upload that validates files, creates exclusive variant-owned assets, and appends in selected-file order.
- [ ] 1.4 Implement permanent Gallery Media delete commands, including thumbnail cleanup and R2/D1 diagnostics.
- [ ] 1.5 Implement atomic multipart Customization Background replacement with authoritative dimension validation, old-asset removal, and thumbnail cleanup.

## 2. Admin Media Manager

- [ ] 2.1 Build thumbnail management for direct product uploads and Variant Media/Customization Background selection.
- [x] 2.2 Add `Manage media` to persisted variant row actions and remove all media controls/deferred media state from Variant Details.
- [ ] 2.3 Build the dedicated Medusa FocusModal with server-confirmed Gallery Media upload and permanent delete controls.
- [ ] 2.4 Add the replace-only Customization Background control with pre-request dimension validation and contextual retry/error states.
- [ ] 2.5 Implement typed Hono RPC admin client commands and refresh the product detail state from successful media responses.

## 3. Verification and Evidence

- [ ] 3.1 Add backend API contract tests for thumbnail selection/clearing, authorization, validation, final semantic keys, append/delete behavior, background replacement, and R2/D1 failures.
- [ ] 3.2 Add admin tests for media-command submission, preflight dimension validation, confirmed-state failure handling, and retry behavior.
- [ ] 3.3 Run backend test/check/build, admin test/build, and `./init.sh`.
- [ ] 3.4 Record verification, deployment notes, and residual risks in this change's `progress.md` and `session-handoff.md`.
