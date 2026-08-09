## 1. Full-create thumbnail initialization

- [x] 1.1 Add a focused helper or local selection step that derives the first eligible asset ID from submitted created variants, preferring Customization Background then first Variant Media.
- [x] 1.2 After variant assets and their ownership links are persisted, best-effort update the new Product's `thumbnailAssetId` without creating or copying media objects.
- [x] 1.3 Log thumbnail-reference assignment failures with Product and selected asset context while preserving the successful full-create response and existing failure cleanup for required persistence.

## 2. Contract coverage

- [x] 2.1 Add full-create route contract coverage for Customization Background priority, Variant Media fallback, and a later variant supplying the first eligible asset.
- [x] 2.2 Add route contract coverage for no eligible media and for a thumbnail-assignment failure that still returns a created Product.

## 3. Verification and change state

- [x] 3.1 Run `pnpm --filter backend test`, `pnpm --filter backend check`, and `pnpm --filter backend build`.
- [x] 3.2 Run `./init.sh`, inspect the diff, and record verification evidence and any pre-existing failures in this change's progress and handoff files.

## 4. Full-create D1 write optimization

- [x] 4.1 Replace full-create's replacement helpers with creation-only persistence that returns option lookup and ordered inserted variants without reading or deleting empty Product state.
- [x] 4.2 Persist full-create catalog translations in one bulk D1 statement instead of serial per-field upserts.
- [x] 4.3 Add coverage for creation-only persistence and run backend verification.
