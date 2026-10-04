## Context

Four admin call sites repeat PDF preview conversion, native dimension reading, and size comparison. A first extraction already exists in `apps/admin/src/lib/media-asset.ts` (`isPdfFile`, `toPreviewImageFile`, `readMediaAsset`, `dimensionsMatch`) and the call sites use it, but `readMediaAsset` still returns `dimensions: null` on failure, so each caller keeps its own fallback (throw, `0`, `{0, 0}`, `undefined`). Dimensions are always measured on the original file (PDF points for PDFs), matching PDF Document Coordinates in `CONTEXT.md`.

## Goals / Non-Goals

**Goals:**
- One module owns preview + dimension reading + comparison for Product media.
- Unreadable dimensions reject the upload everywhere; no `0x0` ever reaches the backend.
- Unit-tested at the helper level.

**Non-Goals:**
- Collection / Category upload flows (only need `toPreviewImageFile`; separate task).
- Backend validation changes (it consumes Declared Background Dimensions as-is).
- Per-screen UI tests.

## Decisions

- **`readMediaAsset` throws on unreadable dimensions** and returns non-nullable `dimensions`. Alternative: keep `null` and let callers decide — rejected, that is exactly the drift being removed. Error message is a single operator-readable string ("Failed to load media dimensions.").
- **Callers keep their own error surface** (`throw` inside hooks, `toast.error` in `variant-media-manager`), but only wrap `readMediaAsset` once; no `.catch` fallbacks.
- **`dimensionsMatch` stays pure** and takes nullable expected values (product canvas may be unset); it returns `false` if any side is missing.
- **Gallery media** still only needs `toPreviewImageFile`; gallery dimensions in Create Product come from `readMediaAsset` as before.

## Risks / Trade-offs

- [Operators can no longer upload a file whose dimensions fail to decode] → Intentional; error message tells them to pick another PNG/JPEG/WebP/PDF.
- [Behavior change in three call sites that previously tolerated failure] → Covered by helper tests; call sites reduce to a single try/await.
- [PDF rendering is still performed per upload] → Unchanged; caching is out of scope.
