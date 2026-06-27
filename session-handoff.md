# Session Handoff

## Current Objective

- Goal: redesign the admin customization editor as a Figma-style editor and replace the old block-only model with an editor model.
- Current status: Implemented. Approved design is in `docs/plans/2026-06-26-customization-editor-ui-model-design.md`. OpenSpec change `customization-editor-ui-model` has proposal, design, specs, and tasks, and all implementation tasks are complete. Follow-up OpenSpec change `customization-editor-canvas-viewport` is also implemented, adding admin canvas `Edit` / `View` modes, direct zoom percentage entry, computed `Fit` focus, and View-mode panning. Text layer canvas sample text is now preview-only/non-selectable so dragging text layers does not highlight text; text editing remains inspector-only. Text layer movement now uses pointer-down geometry snapshots to avoid drift/jumps during re-render. Verification passes with shared package tests/check, backend check/build, admin build, storefront typecheck/build, `openspec validate customization-editor-ui-model --strict`, `openspec validate customization-editor-canvas-viewport --strict`, and `./init.sh`.
- Local dev ports: admin `5174`, backend `8787`, storefront `5175` with matching preview ports.
- Branch / commit: current working branch

## Completed This Session

- [x] Implemented `customization-editor-ui-model` OpenSpec change across shared package, backend, admin, storefront, and exports.
- [x] Implemented `customization-editor-canvas-viewport` OpenSpec change in the admin customization canvas.
- [x] Added canvas `Edit` / `View` modes: Edit keeps layer selection/move/resize/path editing; View pans the viewport without mutating layer geometry.
- [x] Replaced the read-only zoom label with direct percentage input plus synchronized zoom buttons.
- [x] Changed `Fit` from a fixed zoom value to viewport-measured focus that recenters the background canvas.
- [x] Verified the viewport change with `pnpm --filter admin build`, `openspec validate customization-editor-canvas-viewport --strict`, and `./init.sh`.
- [x] Fixed Text layer drag interaction by making canvas sample text non-selectable and pointer-transparent, then fixed text movement drift by using pointer-down geometry snapshots; verified with `pnpm --filter admin build` and `./init.sh`.
- [x] Replaced the shared customization contract with editor-model `background`, `layers`, and `formFields`.
- [x] Added shared editor-model tests for layer stack vs form order, hidden layers, path line rules, silent text trim, image shape clipping helpers, and uniform crop metadata.
- [x] Updated backend customization template APIs to persist/return editor-model payloads and validate publish/design submissions.
- [x] Rebuilt admin customization authoring into an editor workspace with top header, vertical rail, canvas, inspector, preview dialog, background tab, layers tab, form tab, text/image-shape inspectors, delete undo, keyboard nudges, and custom path point editing.
- [x] Updated storefront customization rendering to consume editor-model fields/layers with text fitting and clipped image-shape upload crop controls.
- [x] Updated SVG/PDF preview exports to use editor-model runtime layers; SVG covers text paths, image shapes, clipping, and z-order.
- [x] Fixed pre-existing backend typecheck issue in `apps/backend/src/routes/product-assets.ts`.
- [x] Verified with `pnpm --filter @trophy/customization test`, `pnpm --filter @trophy/customization check`, `pnpm --filter backend check`, `pnpm --filter backend build`, `pnpm --filter admin build`, `pnpm --filter router-cf typecheck`, `pnpm --filter router-cf build`, `openspec validate customization-editor-ui-model --strict`, and `./init.sh`.

- [x] Completed brainstorming/design for the editor UI: top header, left vertical rail (`Blocks`, `Layers`, `Form`, `Background`), central canvas, right selection inspector, and full-screen Preview dialog.
- [x] Chose Approach B: replace the customization model fully with `background`, `layers`, and `formFields`.
- [x] Documented Text behavior: max lines, min/max font size, horizontal-only resize, fixed or shopper-selectable color/font, alignment, preset/custom text paths, Bezier custom path editing, and silent overflow trim.
- [x] Documented Image Shape behavior: rectangle/circle/ellipse/rounded rectangle/star/heart, fixed shape type after creation, aspect-ratio lock rules, cover-fit upload, shape clipping, pan, and uniform zoom only.
- [x] Wrote and committed `docs/plans/2026-06-26-customization-editor-ui-model-design.md`.
- [x] Created OpenSpec change `customization-editor-ui-model` with proposal, design, two capability specs, and implementation tasks.
- [x] Verified `openspec validate customization-editor-ui-model --strict`.

- [x] Fixed variant media gallery backdrop click: added `pointer-events-auto` to gallery overlay + `onClick` handler (`e.target === e.currentTarget`) to close gallery.
- [x] Fixed Escape key: capture-phase `keydown` listener closes gallery + `stopPropagation`/`preventDefault`, guarded FocusModal `onOpenChange` with `!variantGallery` check. First Escape closes gallery, second Escape closes FocusModal.
- [x] Browser-verified both backdrop click and Escape-two-press flow on create-product page.
- [x] Admin build passes (`pnpm --filter admin build`).
- [x] Added fixed vs shopper-selectable text color/font-family policies to the shared customization contract and storefront form renderer.
- [x] Added block hide/unhide and dependency-aware delete behavior in the admin editor.
- [x] Added same-page `Edit` / `Preview` mode in the admin customization editor and kept preview sandbox values separate from the saved draft template state.
- [x] Fixed admin/storefront preview text rendering so `text_single` stays on one canvas line while `text_multi` preserves newline breaks in the rendered layer.
- [x] Kept `visibleWhen` intact while allowing both `icon_picker` and `image_upload` blocks to use either admin-provided presets or an uploaded media value from the same block control/value slot.
- [x] Updated admin block placement editing so operators move and resize block bounds only; rotation handles are disabled and resize persists width/height ratios rather than exposing scale semantics.
- [x] Added uploaded-media cover crop support: uploaded icon/image values persist crop zoom and pan metadata, Konva previews clip cover-fit media to fixed block bounds, and storefront plus admin Preview mode let users drag uploaded media and adjust zoom without changing block geometry.
- [x] Updated and validated the `cup-customization-production` OpenSpec for uploaded-media pan/zoom crop behavior.
- [x] Reused the shopper-form rendering rules inside admin preview mode so operators can test text, textarea, selectable styles, preset icons, and production-image upload behavior without leaving the editor.
- [x] Verified the preview media-source and admin move/resize editor changes with `pnpm --filter @trophy/customization test`, `pnpm --filter admin build`, and `pnpm --filter router-cf build`.
- [x] Verified uploaded-media cover crop with `pnpm --filter @trophy/customization test`, `pnpm --filter admin build`, `pnpm --filter router-cf build`, and `openspec validate cup-customization-production --strict`.
- [x] Verified `pnpm --filter @trophy/customization test`, `pnpm --filter admin build`, `pnpm --filter router-cf build`, `pnpm --filter backend build`, and `openspec validate cup-customization-production --strict`.

- [x] Rewrote the shared customization contract to a block-only model and removed current zone/surface usage from runtime types.
- [x] Updated admin/storefront/backend customization flows to use `blocks`, `blockId`, and `blockCount`.
- [x] Rewrote `cup-customization-production` proposal/design/spec/tasks to match block-only authoring and export.
- [x] Verified `pnpm --filter @trophy/customization test`, `pnpm --filter admin build`, `pnpm --filter router-cf build`, `pnpm --filter backend build`, and `openspec validate cup-customization-production --strict`.

- [x] Rewrote `seed-admin.mjs` to insert directly into D1 via `wrangler d1 execute` instead of POST-ing to the HTTP bootstrap endpoint.
- [x] Password hashing uses Node.js `crypto.scrypt` with the same parameters as better-auth (N=16384, r=16, p=1, dkLen=64).
- [x] No more `--url`, `--secret`, or bootstrap secret env vars needed for the CLI seed flow.
- [x] Supports `--target=local` (default) and `--target=remote`.
- [x] Still checks for existing users before inserting (idempotent).
- [x] Kept the HTTP bootstrap endpoint in the backend for the admin app's onboarding UI.
- [x] Verified with direct execution and `./init.sh`.
- [x] Applied `docs/plans/2026-06-23-medusa-thin-product-catalog-design.md` to the admin create-product flow and mock catalog model.
- [x] Removed thin-scope exclusions from the v1 admin product authoring path: `discountable`, `shipping profile`, `sales channels`, `managed inventory`, `inventory kits`, and `Low stock` product status.
- [x] Updated `/products/new` so `Details` previews generated variants, `Organize` only covers collection/categories plus optional type/tags, and `Variants` only edits title, SKU, allow backorder, price, and inventory quantity.
- [x] Verified the thin-scope alignment with `pnpm --filter admin build` and `./init.sh`.
- [x] Added variant-specific media upload for `/products/new` so each variant row can upload multiple images, preview thumbnails, and delete uploaded assets inline.
- [x] Added backend product-asset metadata storage plus `/api/products/assets` POST/GET/DELETE endpoints and applied local migration `0006_calm_butterfly.sql`.
- [x] Verified the variant-media implementation with `pnpm --filter backend build`, `pnpm --filter admin build`, `pnpm --filter backend db:migrate:local`, and `./init.sh`.

## Completed This Session (legacy)

- [x] Added renderer-independent customization domain/types and tests.
- [x] Added customization D1 schema, migration `0002_steep_tag.sql`, and local migration evidence.
- [x] Added Hono customization template/design/validation/SVG/PDF endpoints.
- [x] Added admin multi-zone React Konva template authoring.
- [x] Added storefront React Konva text/image customization with auto-fit and DPI feedback.
- [x] Browser-verified the new admin and storefront flows and reran the root harness.
- [x] Added local R2 binding, persisted PNG/JPEG upload, private content proxy, decoded dimension validation, and storefront upload integration.
- [x] Smoke-tested R2 locally and confirmed byte-for-byte download integrity.
- [x] Reworked shopper customization into admin-defined typed blocks with fixed geometry and a non-interactive live preview.
- [x] Added default logo/background choices, bounded text fields, conditional uploads, acknowledgements, and final confirmation.
- [x] Persisted block definitions in zone revisions and made backend validation rebuild layers from submitted block values.
- [x] Updated the `cup-customization-production` OpenSpec so v1 personalization blocks are explicitly limited to `text_single`, `text_multi`, `image_upload`, and `icon_picker`; TrophySmack-style `perpetual_list` is deferred to v2 and must not be modeled as a textarea.
- [x] Added the responsive coordinate model to OpenSpec: the preview asset stores intrinsic size, zones are normalized against the preview image, blocks are normalized against their parent zone, and admin drag/resize persists ratios rather than viewport pixels.
- [x] Aligned the shared runtime contract to the v1 taxonomy and removed the default fixture's old background/preset-media block shape in favor of `badge_icon`, `uploaded_logo`, `line_1`, and `line_2`.
- [x] Added shared `fitPreviewIntoBox`, `getZonePreviewRect`, and `getBlockPreviewRect` helpers plus contract coverage for responsive `image -> zone -> block` rehydration.
- [x] Updated the admin customization template editor so uploaded previews capture intrinsic width/height, the canvas respects image aspect ratio, and renderable blocks can be dragged/resized directly inside the selected zone.
- [x] Updated the storefront customizer to render from the same aspect-ratio-aware geometry model and v1 block taxonomy.
- [x] Added local migration `0007_quaint_geometry.sql` so customization template revisions persist `preview_width_px` and `preview_height_px`.

- [x] Added `/products/new` to the admin router
- [x] Implemented a Medusa-like create product page with section-based authoring
- [x] Reworked the create product page into a Medusa-like three-tab workflow while keeping it as a dedicated route instead of a modal
- [x] Rewrote the create-product OpenSpec so Medusa parity now explicitly covers the purpose of `Details`, `Organize`, and `Variants`, plus variant-option authoring and variant-row pricing
- [x] Applied the OpenSpec to the admin UI: `Details` now owns variant toggle plus option/value authoring, `Organize` is metadata-only, and `Variants` now uses a row editor for SKU, inventory flags, price, and inventory
- [x] Flattened the create-product page layout and switched its shell to `@medusajs/ui` components so the route now uses Medusa-style tabs and tables instead of nested local cards
- [x] Moved the create-product experience into a `@medusajs/ui` `FocusModal` overlay above the products list so `/products/new` now behaves closer to Medusa's modal workflow
- [x] Added mock catalog persistence so created products show up in the product list
- [x] Added draft and publish validation using `valibot`
- [x] Added `/orders/:orderId` and a Medusa-like order detail workspace with mock actions
- [x] Replaced local admin demo auth with Better Auth on `apps/backend` and `apps/admin`
- [x] Added D1/Drizzle auth tables, the username plugin, and local migration `0004_username_admin.sql`
- [x] Added first-super-admin bootstrap, admin team management, manual password reset, and signed-in password change
- [x] Added a one-time `pnpm --filter backend seed:admin` helper that calls the bootstrap endpoint with env/flag inputs
- [x] Verified bootstrap, sign-in, get-session, change-password, create-user, disable user, set-user-password, revoke-user-sessions, and disabled-user rejection against the local worker
- [x] Re-ran repo verification from the root
- [x] Configured dedicated dev/preview ports for all three apps and verified the repo with `./init.sh`
- [x] Moved backend CORS resolution into a single `app.ts` helper, shared origin/policy constants in `src/lib/cors.ts`, and aligned Vite dev-server preflight so local credentialed auth requests from the repo's fixed app ports pass
- [x] Wrote `docs/plans/2026-06-23-medusa-thin-product-catalog-design.md` to lock the catalog into a Medusa-thin v1: keep variant pricing, collection/category taxonomy, and custom attributes; remove sales channels, shipping profiles, inventory kits, and other Medusa-full complexity from the approved scope
- [x] Wrote `docs/plans/2026-06-23-admin-sidebar-medusa-design.md` to lock the shell/navigation pass before implementation
- [x] Rebuilt the protected admin shell into a Medusa-style dark rail with grouped navigation, nested `Products -> Collections/Categories`, bottom-pinned settings/account actions, and placeholder pages for unfinished commerce sections
- [x] Updated the product-related OpenSpec changes to the approved Medusa-thin scope and validated `2026-06-21-product-catalog`, `2026-06-21-admin-create-product-page`, and `2026-06-21-admin-product-detail-page` with `openspec validate --strict`

## App.tsx Refactor (2026-06-23)

The monolithic 4071-line `App.tsx` was refactored into ~20 focused files using the automated code modularization workflow:

**Types** → `src/types.ts`
**Lib utilities** → `src/lib/utils.ts`, `auth-utils.ts`, `validation.ts`, `product-utils.ts`, `order-utils.ts`, `mock-data.ts`
**Context providers** → `src/hooks/use-auth.tsx`, `use-catalog.tsx`, `use-orders.tsx`
**Page components** → `src/pages/` (11 files)
**Layout components** → `src/components/layout/shell.tsx`, `sidebar.tsx`, `admin-shell.tsx`

`App.tsx` now only composes providers and routes (~100 lines). Each page/concern now has a single responsibility and clear data ownership. Build verified with `pnpm --filter admin build` and `./init.sh`.

## Verification Evidence

| Check             | Command                                                                          | Result | Notes                                                                                                                       |
| ----------------- | -------------------------------------------------------------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------- |
| Backend migration | `pnpm --filter backend db:generate` and `pnpm --filter backend db:migrate:local` | Pass   | Added and applied Better Auth D1 tables locally                                                                             |
| Admin build       | `pnpm --filter admin build`                                                      | Pass   | Confirms the expanded admin SPA compiles cleanly                                                                            |
| Repo verification | `./init.sh`                                                                      | Pass   | Full documented repo verification completed successfully on 2026-06-22                                                      |
| Auth smoke test   | local worker + `curl` against bootstrap/auth/admin endpoints                     | Pass   | Bootstrap, sign-in, get-session, change-password, create-user, ban-user, set-user-password, revoke-user-sessions all worked |
| Seed script       | `pnpm --filter backend seed:admin -- --username=test --password=test1234`         | Pass   | Direct D1 insert via wrangler, skips on re-run (idempotent), user/account records verified in DB |

Sidebar shell verification on 2026-06-23:

- `pnpm --filter admin build`: pass after the Medusa-style sidebar and placeholder-route refactor.
- `./init.sh`: pass after the sidebar refactor.
- Medusa reference was compared directly against `http://localhost:9000/app` while designing the shell hierarchy and visual direction.

Customization verification on 2026-06-22:

- `vp test`: 4 shared domain tests pass.
- Backend check/build and storefront typecheck/build pass.
- Local R2 upload/proxy download passed with a byte-for-byte SHA-256 match.
- Root `vp check` remains blocked by 69 existing formatting differences outside this customization slice; touched files pass targeted formatting.

## Files Changed

- `apps/admin/src/App.tsx` - refactored sidebar to use medusa components; removed inline sidebar rendering and old helper functions
- `apps/admin/src/lib/sidebar-config.ts` - new file: sidebar nav item config with only real project features
- `apps/admin/src/components/ui/medusa/sidebar.tsx` - new file: reusable medusa-style sidebar components
- `apps/admin/src/components/ui/medusa/index.ts` - exported new sidebar components
- `feature_list.json` - updated feat-004 evidence
- `progress.md` - recorded sidebar refactor
- `session-handoff.md` - updated restart notes
- `docs/plans/2026-06-23-admin-sidebar-medusa-design.md`
- `apps/admin/src/lib/auth-client.ts`
- `apps/admin/vite.config.ts`
- `apps/backend/vite.config.ts`
- `apps/storefront/vite.config.ts`
- `apps/admin/README.md`
- `apps/backend/README.md`
- `apps/storefront/README.md`
- `apps/backend/package.json`
- `apps/backend/drizzle/0004_username_admin.sql`
- `apps/backend/drizzle/meta/_journal.json`
- `apps/backend/scripts/seed-admin.mjs` - rewrote from HTTP-bootstrap to direct D1 insert via wrangler
- `apps/backend/README.md` - updated seed script documentation
- `AGENTS.md` - updated seed script documentation
- `session-handoff.md` - recorded seed script rewrite

## Decisions Made

- **Seed script now inserts directly into D1 instead of calling the HTTP bootstrap endpoint.**
  - Context: the CLI seed flow no longer needs the bootstrap endpoint, simplifying local setup and removing the bootstrap-secret dependency for the CLI path.
  - The HTTP bootstrap endpoint is retained in the backend for the admin app's browser-based onboarding UI, which is a legitimate use case for fresh deployments.
  - Alternatives considered: keeping the HTTP-based approach, which would require the user to know/configure a bootstrap secret for the CLI flow.
- Keep the create product experience mock-first for now so admin authoring can move ahead without waiting on live API wiring.
- Model the page after Medusa information architecture, then tighten it further into a three-tab workflow: `Details`, `Organize`, and `Variants`.
- Keep the spec authoritative for Medusa parity: option titles and values are defined in `Details`, prices are entered in `Variants`, and `Organize` remains metadata-only.
- The mock catalog model is now trimmed to the approved Medusa-thin v1 for the create-product flow; future product-detail work should preserve that reduced scope instead of reintroducing Medusa-full fields.
- Match Medusa shell UX early so later `collections`, `categories`, and related merchandising work can land inside the right information architecture instead of forcing another shell rewrite.
- `@medusajs/ui` is already installed and wired through Tailwind preset/content scanning in `apps/admin`, so future Medusa parity work should prefer those primitives before adding local wrappers.
- Persist mock catalog state in browser storage so the products list reflects newly created records during local iteration.
- Keep order detail actions mock-first as well, updating local order state and timeline until backend order contracts exist.
- Use Better Auth's built-in admin plugin primitives (`createUser`, `banUser`, `setUserPassword`, `revokeUserSessions`) instead of inventing a parallel account-management layer.
- Treat employee offboarding as `disable + revoke sessions`, not delete.
- Use only two roles: `super-admin` for account lifecycle operations and `admin` for day-to-day admin work.
- Leave forgot-password out of v1; use signed-in password change plus manual reset by another admin or developer.

## Blockers / Risks

- (RESOLVED) Variant media gallery was non-interactive due to Radix Dialog `pointer-events: none` on body — fixed with `pointer-events-auto` on gallery overlay.
- (RESOLVED) Escape key closed FocusModal instead of gallery — fixed with capture-phase listener + guarded `onOpenChange`.
- (RESOLVED) `GET /api/customizations/templates` returned 500 due to missing `blocks_json` column — fixed via ALTER TABLE.
- (RESOLVED) `ProductSelector` sent `limit=200` exceeding backend max of 100 — changed to `limit=100`.
- (RESOLVED) Products endpoint had no CORS middleware for admin cross-origin requests — added `PRODUCTS_CORS_POLICY`.
- Customization admin still uses local template state; connect publish/load to the Hono template endpoints.
- The backend TypeScript `check` command is still blocked by pre-existing issues in `apps/backend/src/routes/product-assets.ts`, which were not touched by this customization slice.
- Approved font storage, SVG glyph outlining, and custom-font PDF embedding remain pending.
- Staging/production customization deployment needs environment-specific D1 IDs alongside the confirmed R2 buckets.
- The create product flow is still browser-local mock persistence, not backend-backed data.
- Variant media uploads are now backend-backed even though the create-product record itself is still mock-first, so canceled create flows or removed option combinations can leave orphaned uploaded assets until cleanup policy is added.
- Order detail actions are still browser-local mock state, not backend-backed operations.
- Production deployment still needs explicit `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `ADMIN_APP_ORIGIN`, and `ADMIN_BOOTSTRAP_SECRET` bindings.

## Next Session Startup

1. Read `AGENTS.md`.
2. Read `feature_list.json` and `progress.md`.
3. Review this handoff.
4. Continue the customization production path: draft/freeze validation, export jobs, production font handling.

## Recommended Next Step

- Gallery interaction is now working (backdrop click + Escape). No pending gallery work. Pick next item from feature_list.json.
