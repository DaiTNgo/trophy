# Session Handoff

The change `separate-variant-customization-media` is implemented in the shared workspace; the remaining verification blocker is the repository's pre-existing admin build failure.

Read these files first:

- `proposal.md` for scope and rationale.
- `design.md` for persistence, API, readiness, admin, and storefront decisions.
- `specs/variant-customization-media/spec.md` for normative scenarios.
- `tasks.md` for the implementation checklist.

The repository is in dev mode. Do not add a compatibility migration or preserve the old first-gallery-image canvas behavior. Existing ADR/context updates explain the domain decision; active implementation follows the new OpenSpec contract.

Implementation highlights:

- Added `product_variant_customization_media` one-to-one persistence and read-model fields.
- Added full-create support and `PUT /api/admin/products/:id/variants/:variantId/customization-media` replacement semantics.
- Separated admin create/detail staged state and controls from gallery media.
- Updated customization editor/storefront canvas selection and empty-gallery display fallback.
- Removed the stale unimported storefront JavaScript customization helper.

Verification and blocker details are recorded in `progress.md`.
