## 1. Domain Contracts and Persistence

- [ ] 1.1 Add shared Valibot schemas and TypeScript domain types for template revisions, zones, designs, layers, assets, validation results, and export profiles.
- [ ] 1.2 Add Drizzle tables and migrations for customization templates, revisions, zones, approved fonts, design revisions, layers, asset metadata, and export jobs.
- [ ] 1.3 Add fixtures and contract tests for multi-zone templates, normalized geometry, immutable revisions, and invalid production rules.

## 2. Asset Storage and Backend APIs

- [ ] 2.1 Confirm R2 bucket names, environments, retention policy, CORS, upload limits, and secrets with the user before changing Wrangler bindings.
- [ ] 2.2 Add private R2 bindings and signed upload/download flows for cup previews, original shopper uploads, preview derivatives, fonts, and generated output.
- [ ] 2.3 Add Hono routes for template CRUD/publication, published template retrieval, asset registration, design drafts, validation, and export status.
- [ ] 2.4 Add MIME, decoded-format, dimension, ownership, and immutable-asset validation for production inputs.

## 3. Shared Geometry and Text Rules

- [ ] 3.1 Implement and test normalized preview-to-zone coordinate conversion and millimetre-to-PDF-point conversion.
- [ ] 3.2 Implement crop, rotation, clipping, safe-area, and effective-DPI calculations as renderer-independent functions.
- [ ] 3.3 Integrate `opentype.js` and implement binary-search single-line fitting against approved font revisions.
- [ ] 3.4 Add parity fixtures proving browser and backend geometry/text validation produce equivalent results.

## 4. Admin Template Authoring

- [ ] 4.1 Add `konva` and `react-konva` to the admin and create the customization-template route and page shell.
- [ ] 4.2 Implement cup preview upload plus multi-zone create, select, move, resize, rotate, and delete interactions.
- [ ] 4.3 Implement zone properties for physical dimensions, safe margin, bleed, allowed content, fonts, DPI, production method, and color expectation.
- [ ] 4.4 Implement draft revision, publication validation, product assignment, and revision history behavior.
- [ ] 4.5 Add component and workflow tests for template authoring and invalid publication.

## 5. Storefront Customization

- [ ] 5.1 Add `konva` and `react-konva` to the storefront and load the product's published template revision through route data flow.
- [ ] 5.2 Implement zone navigation and isolated renderer-independent document state.
- [ ] 5.3 Implement single-line text input, automatic font fitting, approved font loading, and blocking fit errors.
- [ ] 5.4 Implement original image upload, preview rendering, move, zoom, rotate, crop, and effective-DPI feedback.
- [ ] 5.5 Implement draft save, authoritative pre-checkout validation, immutable revision freeze, and review summary.
- [ ] 5.6 Add interaction and contract tests for text, image, DPI, multiple zones, and template version changes.

## 6. SVG and PDF Production Export

- [ ] 6.1 Implement a typed SVG renderer with physical artboards, clipping, image transforms, outlined text, safe/bleed guides, and metadata.
- [ ] 6.2 Integrate `pdf-lib` and `@pdf-lib/fontkit` for physical PDF pages, vector text/path output, original images, clipping, and metadata.
- [ ] 6.3 Implement the initial separate-zone export profile and the abstraction for later combined workshop layouts.
- [ ] 6.4 Implement idempotent export jobs, artifact storage, retry behavior, and operator download authorization.
- [ ] 6.5 Add golden SVG/PDF fixtures and manual prepress checks for dimensions, fonts, DPI, clipping, bleed, and safe area.

## 7. Verification and Harness Handoff

- [ ] 7.1 Run local database migration and backend contract/export tests.
- [ ] 7.2 Run `vp check`, `vp test`, app-specific builds, and any configured Vite tasks.
- [ ] 7.3 Run `./init.sh` from the repository root.
- [ ] 7.4 Record implementation evidence and remaining workshop decisions in `feature_list.json`, `progress.md`, and `session-handoff.md`.
