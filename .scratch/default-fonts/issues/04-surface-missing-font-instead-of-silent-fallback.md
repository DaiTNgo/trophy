# 04: Surface a missing font instead of silently rendering Sans

**What to build:** When a Brand Font is deleted or its file is missing, the admin font loader and the font variant resolver quietly fall back to Sans, so order previews and exports show the wrong font with no signal. Per the Order Font Reference definition, a missing shared file must be reported as an unavailable font. Admin order customization preview and PDF/raster export show a warning naming the unavailable font (export may still produce output with a fallback, but never without the warning). Storefront keeps removing unusable options from the shopper's choices and no longer falls back silently for a font the shopper selected.

**Blocked by:** 01 (Single source of truth for Default Font Family files)

**Status:** ready-for-agent

- [ ] An order whose Order Font Reference points at a deleted Brand Font shows a warning with the font name in preview and export, without crashing.
- [ ] No silent fallback to Sans remains for fonts that cannot be found; any fallback used for export always returns a warning to the UI.
- [ ] Unit tests for the loader/resolver: found font → bytes; missing font → "unavailable" result carrying the font name; default fonts are always available.
- [ ] API test: the uploaded-font file route returns a typed 404 JSON when the file is missing.
- [ ] `pnpm --filter admin build`, `pnpm --filter customization test`, `pnpm --filter backend test` pass.
