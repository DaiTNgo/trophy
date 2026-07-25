## Why

Variant media currently serves two incompatible purposes: storefront reference images and the canvas image used by product customization. Treating every gallery image as a canvas forces unrelated images to share dimensions and makes it impossible for a shop to show additional past-work examples. This change gives each variant an independently managed customization canvas while preserving a separate gallery.

## What Changes

- **BREAKING** Replace the current “first/any variant gallery image is the customization background” contract with a variant-owned Customization Media asset.
- Add independent upload, replace, preview, and lifecycle handling for one Customization Media asset per variant.
- Keep Gallery Media as a separate, ordered collection used for product reference imagery and storefront gallery management.
- Add separate Gallery media and Customization media actions in Admin Create Product and Admin Product Detail.
- Enforce shared dimensions across Customization Media assets for a customizable product; reject an invalid replacement without changing the current asset.
- Allow incomplete Customizable Product drafts, but require every variant's Customization Media before opening the editor or publishing; published products cannot gain a variant without a valid canvas.
- Make the customization editor and storefront selected-variant preview use the variant's Customization Media, never a Gallery Media picker.
- Use Customization Media only as a shopper-facing image fallback when a variant has no Gallery Media; do not add it to the managed gallery collection.
- Remove the old gallery-derived fallback for existing development data; no compatibility migration is required.

## Capabilities

### New Capabilities

- `variant-customization-media`: Independent variant customization canvas assets, admin management, readiness rules, and shopper rendering behavior.

### Modified Capabilities

<!-- No canonical non-archived specs exist yet; the archived product-owned customization contract is superseded by this new capability. -->

## Impact

- Backend D1 schema, product asset ownership, admin product create/detail routes, product read models, publish validation, and asset deletion.
- Admin Create Product variant media UI, Product Detail variant editor, and customization editor background data.
- Storefront product detail/list imagery and selected-variant customization preview.
- Existing archived product-owned customization assumptions and ADR 0001 are superseded by ADR 0003; implementation must not retain gallery-derived canvas compatibility.
