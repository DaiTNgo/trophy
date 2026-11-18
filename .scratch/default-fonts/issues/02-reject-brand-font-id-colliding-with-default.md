# 02: Reject Brand Fonts whose id collides with a Default Font Family

**What to build:** The admin creates a Brand Font with an id slugged from its name. A font named "Sans", "Serif" or "Script" gets id `sans`/`serif`/`script`, and because uploaded fonts are looked up before defaults, it silently takes over the Default Font Family. The backend must reject creating a Brand Font whose id is a default family id, returning a typed JSON error; the "Add font family" modal shows that error to the admin.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] Creating a Brand Font named "Sans", "Serif" or "Script" (any casing/spacing) is rejected with a clear error and nothing is written to the database.
- [ ] API contract tests cover: success with a valid id, 4xx for a default-family id, 4xx for an already-existing id, and admin auth/role checks.
- [ ] The Add font family modal displays the backend error message.
- [ ] The reserved id set comes from the shared default family definition, not a second hardcoded list.
- [ ] `pnpm --filter backend test/check/build` and `pnpm --filter admin build` pass.
