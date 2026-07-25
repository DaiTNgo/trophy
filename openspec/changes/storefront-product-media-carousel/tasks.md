## 1. Shared customization interaction contract

- [x] 1.1 Add an optional form-interaction callback prop to `ProductCustomizationForm` and invoke it from focus/pointer interaction on the form surface without changing form values.
- [x] 1.2 Add focused package tests or a small test harness covering callback delivery for form controls and repeated interactions.

## 2. Storefront media model and state

- [x] 2.1 Normalize the selected variant's Customization Media plus ordered Gallery Media into one deduplicated carousel sequence.
- [x] 2.2 Replace direct gallery-only active-media state with an active carousel index, including loop navigation and empty/single-item handling.
- [x] 2.3 Reset the carousel on variant changes to Customization Media first, falling back to the first Gallery Media.
- [x] 2.4 Wire the customization form callback to reset the active media to the selected variant's Customization Media while preserving customization values.

## 3. Product gallery UI

- [x] 3.1 Add accessible Previous and Next controls around the main media content and connect them to the shared carousel index.
- [x] 3.2 Feed the unified sequence into desktop and mobile thumbnails, preserving direct selection and active styling.
- [x] 3.3 Verify responsive layout behavior, loop transitions, missing-media fallback, and form-interaction reset in the storefront product route.

## 4. Verification and documentation

- [x] 4.1 Add or update storefront/component tests for carousel ordering, navigation, variant reset, and customization preview reset.
- [x] 4.2 Run relevant package checks and storefront typecheck/build; record any pre-existing baseline failures separately from this change.
- [x] 4.3 Update the change progress and session handoff with verification evidence and implementation notes.
