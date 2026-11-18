# 03: Real Bold / Italic / Bold Italic files for Default Font Families

**What to build:** All four styles of each Default Font Family currently point to the same Regular file, yet capabilities report bold/italic as available, so shoppers and admins see B/I controls that do nothing. Current files are all Regular only: sans = Open Sans (variable weight/width axes, no italic), serif = Playfair Display (variable weight axis, no italic), script = Pacifico (static, upstream has no bold/italic). Add real files for every missing style, register them in the shared mapping, and make capabilities reflect only styles that truly exist so B/I controls appear only when a real file backs them. No synthetic bold/italic.

- sans and serif (OFL): add Bold, Italic, Bold Italic as **static instances** (renderers use the default instance of a variable font, so changing the weight axis alone is not enough).
- script (Pacifico): stays regular-only with bold/italic/boldItalic capabilities false. Replacing it with a family that has all four styles is a design change and needs user confirmation first.

**Blocked by:** 01 (Single source of truth for Default Font Family files)

**Status:** ready-for-agent

- [ ] Real TTFs exist for sans and serif in Regular, Bold, Italic, Bold Italic; font names and OFL licence are recorded in the repo.
- [ ] Shared mapping points each style to its own file; script reports no bold/italic.
- [ ] Unit tests assert known-good literals: sans/serif capabilities = all four styles, script = regular only; resolving sans with bold+italic returns the bold-italic variant.
- [ ] API tests: the sans-bold, sans-italic, sans-bold-italic and serif-* font URLs return 200 with distinct files.
- [ ] Storefront preview, admin preview, PDF export and raster export all render the real bold/italic glyphs for default fonts.
- [ ] Existing orders using ids `sans`/`serif`/`script` still render (ids unchanged).
- [ ] Added asset size noted in `progress.md`; `./init.sh` passes.
