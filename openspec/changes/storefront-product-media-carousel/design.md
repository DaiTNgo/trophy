## Context

The storefront product route already knows the selected variant, its ordered Gallery Media, and its independent Customization Media. `ProductGallery` renders the main content and thumbnail strip, while `@trophy/customization-react` renders the customization canvas and form. Today the route selects gallery media directly and the shared package has no way to tell the route that the shopper has returned to editing.

The feature must preserve the existing selected-variant and form-value behavior, work in both responsive product layouts, and avoid coupling the reusable customization package to storefront product concepts.

## Goals / Non-Goals

**Goals:**

- Present one selected-variant media sequence with Customization Media first and Gallery Media ordered by position.
- Support looping Previous/Next navigation and direct thumbnail selection on desktop and mobile.
- Reset the visible media to the selected variant's Customization Media after customization form focus/click, without resetting form values.
- Reset media selection when the shopper changes variants.
- Expose a small, reusable form interaction callback from `@trophy/customization-react`.

**Non-Goals:**

- Do not add gallery or product-media state to `@trophy/customization-react`.
- Do not change backend routes, database schema, media upload behavior, or product read-model contracts.
- Do not let carousel navigation change the selected variant.
- Do not clear, reinitialize, or otherwise mutate customization form values on preview reset.

## Decisions

### Storefront owns the media state

The product route owns the media sequence, active index, selected variant reset, and `ProductGallery` controls because it owns product and variant media. The shared package receives an `onInteraction` callback from the form and does not know what a gallery or variant is.

**Alternative considered:** Put carousel state in `@trophy/customization-react`. Rejected because it would make a reusable customization renderer depend on product-catalog concepts and would not work for non-product consumers such as order previews.

### Build one normalized sequence per selected variant

The route creates a display-only sequence containing the variant's Customization Media first when present, then Gallery Media sorted by their persisted `position`. Each media item has a stable id and source URL. The active index is used for both thumbnail highlighting and Previous/Next actions. Navigation loops modulo the sequence length.

**Alternative considered:** Keep separate customization and gallery indexes. Rejected because the shopper experiences one visual set and separate indexes create ambiguous transitions and duplicate controls.

### Customization interaction is an explicit callback

`ProductCustomizationForm` accepts an optional callback invoked on focus or pointer interaction within the form surface. The storefront callback sets the active media to the selected variant's Customization Media when available, otherwise to the first sequence item. It does not touch `customizationValues`.

**Alternative considered:** Detect document-level clicks in the product route. Rejected because it is brittle, leaks implementation details, and can trigger on unrelated product controls.

### Responsive layouts share the same active media model

The mobile sticky preview and desktop gallery receive the same normalized thumbnails and active main media. Controls are rendered by `ProductGallery` around the main content so both layouts expose the same accessible labels and loop behavior.

**Alternative considered:** Maintain separate mobile and desktop carousel state. Rejected because switching responsive layout could desynchronize the visible image.

## Risks / Trade-offs

- [Risk] A variant without Customization Media cannot satisfy the reset target → fall back to the first available Gallery Media and keep controls usable.
- [Risk] The same media URL may appear in both roles → deduplicate by stable asset/media id where possible so the carousel does not show an accidental duplicate.
- [Risk] Form focus events may fire frequently while navigating controls → make the reset idempotent; setting the existing customization index again must not alter form values or cause avoidable rerenders.
- [Risk] Looping controls can be less obvious to assistive-technology users → provide explicit `aria-label` text and announce the active image position through the existing button/image labels.

## Migration Plan

No data migration or deployment sequencing is required. The change consumes fields already returned by the storefront product read model. Rollback is a frontend revert that restores the previous thumbnail-only selection behavior; the callback remains optional for other package consumers.

## Open Questions

None. Product Media Carousel ordering, looping, variant reset, and Customization Preview Reset behavior were confirmed before proposal creation.
