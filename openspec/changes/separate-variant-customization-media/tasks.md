## 1. Domain and persistence

- [x] 1.1 Update shared/admin types and product read-model contracts to represent nullable per-variant Customization Media separately from ordered Gallery Media.
- [x] 1.2 Add the variant-to-customization-asset D1 relationship with one-to-one ownership and update schema helpers/read queries.
- [x] 1.3 Add asset lifecycle helpers that delete superseded or deleted-variant Customization Media only after the replacement/deletion succeeds.

## 2. Backend API and readiness

- [x] 2.1 Extend full-create validation and persistence to accept optional per-variant Customization Media asset IDs independently from `media[]`.
- [x] 2.2 Add section-specific admin endpoints for uploading/replacing a variant's Customization Media and return explicit typed success, validation, not-found, auth, and readiness-conflict responses.
- [x] 2.3 Update admin product list/detail read models to include Customization Media metadata and preserve Gallery Media ordering independently.
- [x] 2.4 Replace gallery-derived customization canvas/readiness helpers with Customization Media readiness rules, including draft incompleteness and published conflict behavior.
- [x] 2.5 Update variant create/delete/update flows so published products cannot gain a missing or mismatched canvas and deleting a variant cleans up its owned canvas asset.
- [x] 2.6 Add backend route/service tests for separate persistence, upload/replace failure preservation, dimension validation, draft/publish readiness, published variant conflicts, deletion cleanup, and no legacy gallery fallback.

## 3. Admin Create Product

- [x] 3.1 Add separate staged Customization Media state and upload/replace handling to the create-product hook, including PDF conversion and dimension metadata.
- [x] 3.2 Add separate Gallery media and Customization Media buttons/thumbnails to each variant row, hiding the Customization action when customization is disabled.
- [x] 3.3 Wire the full-create payload to submit both media roles and ensure draft/publish validation messages identify missing or mismatched Customization Media.
- [x] 3.4 Update create-product customization background choices and canvas initialization to use only Customization Media.
- [x] 3.5 Add admin helper/component tests for action visibility, first-upload versus replace labels, dimension rejection, and independent media state.

## 4. Admin Product Detail

- [x] 4.1 Add Product Detail variant read/edit state for Customization Media without coupling it to the Gallery media draft.
- [x] 4.2 Add separate Gallery management and Customization Media upload/replace controls with a canvas thumbnail and no remove action.
- [x] 4.3 Surface backend readiness conflicts and preserve the existing Customization Media when replacement fails.
- [x] 4.4 Update the product detail customization editor route to load only variant Customization Media background choices and label each variant.
- [x] 4.5 Add admin detail contract/UI tests covering reload, replacement, disabled customization visibility, editor background choices, and published-product conflicts.

## 5. Storefront rendering

- [x] 5.1 Extend storefront product read models to return variant Customization Media separately from Gallery Media.
- [x] 5.2 Render the selected variant's Customization Media as the customization preview canvas and remove first-gallery-image background assumptions.
- [x] 5.3 Implement the display-only fallback to Customization Media when a variant has no Gallery Media without adding it to gallery management data.
- [x] 5.4 Add storefront API and UI tests for selected-variant canvas switching, independent galleries, empty-gallery fallback, and shopper-safe asset boundaries.

## 6. Cleanup and verification

- [x] 6.1 Remove obsolete gallery-derived customization helpers, compatibility branches, and stale type fields from active code paths.
- [x] 6.2 Update active docs and OpenSpec references so the old first-gallery-image canvas contract is no longer described as current.
- [x] 6.3 Run backend tests/check/build, admin build, storefront typecheck/build, OpenSpec validation, and `./init.sh`; record evidence in change progress/handoff artifacts.
