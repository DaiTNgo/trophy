# 01: Single source of truth for Default Font Family files (prefactor)

**What to build:** The three Default Font Families (sans, serif, script) and their style → file mapping are currently declared three times: in the shared customization package, in the admin PDF font loader, and in the backend static-font route. Make admin and backend derive the mapping from the shared customization package so that adding or changing a default font file touches one place. Behaviour stays identical; this is the prefactor for 03 and 04. Also decide whether the backend's embedded base64 font bundle is still needed now that the backend runs on Node and can read from disk; if not, delete it (dev mode: no dead code kept).

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] Admin PDF font loader and backend static-font route no longer hold their own alias/mapping tables; both use the shared customization mapping.
- [ ] API test (Hono `app.request`) confirms the existing default font URLs (e.g. sans-bold, serif-italic, script-regular, SansBold.ttf) still return 200 with the same file as before; unknown names return typed 404 JSON.
- [ ] Admin PDF export still embeds the correct default fonts.
- [ ] `pnpm --filter backend test/check/build`, `pnpm --filter admin build`, `pnpm --filter customization test` pass.
