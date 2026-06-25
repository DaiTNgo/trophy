## 1. Domain Contracts and Persistence

- [x] 1.1 Add shared TypeScript domain types and helpers for block-only templates, designs, layers, validation, and export geometry.
- [x] 1.2 Add Drizzle persistence for template revisions, preview intrinsic size, and `blocks_json` in the block-only model.
- [x] 1.3 Add fixtures and shared tests for normalized block geometry, immutable revisions, and invalid production rules.
- [x] 1.4 Add typed customization block definitions, preset asset options, conditional visibility, and block-value contracts.
- [x] 1.5 Rename and constrain v1 personalization block contracts to `text_single`, `text_multi`, `image_upload`, and `icon_picker`, with `perpetual_list` deferred from v1.

## 2. Asset Storage and Backend APIs

- [x] 2.1 Confirm R2 binding and bucket names for local, staging, and production; use private Worker-proxied access and a 20 MB image upload limit.
- [ ] 2.2 Add private R2 bindings and signed upload/download flows for cup previews, original shopper uploads, preview derivatives, fonts, and generated output.
- [x] 2.3 Add Hono routes for template CRUD/publication, published template retrieval, design drafts, validation, and block-based SVG/PDF export.
- [ ] 2.4 Add MIME, decoded-format, dimension, ownership, and immutable-asset validation for production inputs.

## 3. Shared Geometry and Text Rules

- [x] 3.1 Implement and test normalized preview-to-block coordinate conversion and millimetre-to-PDF-point conversion.
- [x] 3.1a Remove the intermediate zone layer and persist block bounds directly relative to the preview image.
- [ ] 3.2 Implement crop, rotation, clipping, safe-area, and effective-DPI calculations as renderer-independent functions.
- [x] 3.2a Add uploaded-media cover crop metadata, clipped preview rendering, and pan/zoom controls for shopper/admin Preview mode.
- [ ] 3.3 Integrate approved production font measurement and implement binary-search single-line fitting against real font metrics.
- [ ] 3.4 Add parity fixtures proving browser and backend geometry/text validation produce equivalent results.

## 4. Admin Template Authoring

- [x] 4.1 Add `konva` and `react-konva` to the admin and create the customization-template route and page shell.
- [x] 4.2 Implement cup preview upload plus block create, select, position, size, and delete interactions.
- [x] 4.3 Simplify admin v1 block settings so the primary form exposes only business-facing fields, while placement stays visual and technical export fields stay hidden.
- [ ] 4.4 Implement draft revision, publication validation, product assignment, and revision history behavior.
- [ ] 4.5 Add component and workflow tests for template authoring and invalid publication.
- [x] 4.6 Add v1 personalization block authoring for dynamic per-type fields, including fixed or shopper-selectable text color/font-family options, defaults, preset assets, ordering, and conditions.
- [x] 4.7 Add block management actions for hide/unhide and dependency-aware delete in the admin editor.
- [x] 4.8 Add same-page `Edit` / `Preview` mode switching in the admin template editor and keep preview sandbox values separate from the draft template state.

## 5. Storefront Customization

- [x] 5.1 Load the product's published template revision through storefront route data flow.
- [x] 5.2 Replace zone navigation with a block-driven form and isolated renderer-independent document state.
- [x] 5.3 Implement single-line text input, automatic font fitting, and blocking fit errors in the shared/runtime validator.
- [x] 5.4 Implement original image upload, fixed block-bound preview rendering, and effective-DPI feedback without shopper block-geometry controls.
- [ ] 5.5 Implement draft save, authoritative pre-checkout validation, immutable revision freeze, and review summary.
- [ ] 5.6 Add interaction and contract tests for text, image, shopper-selectable styles, multiple blocks, and template version changes.
- [x] 5.7 Replace direct layer manipulation with a schema-driven form and non-interactive live preview.
- [x] 5.8 Add text/textarea limits, preset logo/background selection, conditional upload, rights acknowledgement, fixed or shopper-selectable text styles, review, and confirmation.
- [x] 5.9 Align the storefront form renderer to v1 personalization controls: one-line `text_single`, bounded `text_multi`, fixed `image_upload`, and `icon_picker` grid, with no `perpetual_list`.
- [x] 5.10 Ensure hidden blocks are excluded from shopper form rendering, preview rendering, and validation.
- [x] 5.11 Reuse the same shopper-form rendering rules inside admin preview mode for draft testing.

## 6. SVG and PDF Production Export

- [x] 6.1 Implement a typed SVG renderer with physical artboards, clipping, image transforms, safe/bleed guides, and metadata for block exports.
- [x] 6.2 Integrate `pdf-lib` for physical PDF pages, text/image output, clipping, and metadata for block exports.
- [ ] 6.3 Implement the initial separate-block export profile and the abstraction for later combined workshop layouts.
- [ ] 6.4 Implement idempotent export jobs, artifact storage, retry behavior, and operator download authorization.
- [ ] 6.5 Add golden SVG/PDF fixtures and manual prepress checks for dimensions, fonts, DPI, clipping, bleed, and safe area.

## 7. Verification and Harness Handoff

- [ ] 7.1 Run local database migration and backend contract/export tests.
- [x] 7.2 Run package tests and app-specific builds for the block-only refactor.
- [ ] 7.3 Run `./init.sh` from the repository root.
- [x] 7.4 Record implementation evidence and remaining workshop decisions in `feature_list.json`, `progress.md`, and `session-handoff.md`.
