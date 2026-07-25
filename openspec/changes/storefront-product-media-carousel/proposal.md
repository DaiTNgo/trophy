## Why

The storefront currently exposes variant thumbnails but does not provide an obvious way to step through the selected variant's complete visual set. Customization Media is the canvas shoppers need while editing, while Gallery Media provides additional product references; both should be viewable without mixing their roles. This change adds a coherent media carousel and makes returning to the customization form reliably restore the customization image.

## What Changes

- Add a unified selected-variant media carousel containing Customization Media first, followed by Gallery Media ordered by position.
- Add visible Previous and Next controls around the main product image on desktop and mobile, with looping navigation and existing thumbnails retained.
- Reset the visible image to the selected variant's Customization Media whenever the shopper focuses or clicks the customization form, while preserving entered form values.
- Reset the carousel to the new variant's Customization Media when the shopper changes variants, falling back to the first Gallery Media when no Customization Media exists.
- Extend `@trophy/customization-react` with a form-interaction callback only; keep carousel state and product-media knowledge in storefront.

## Capabilities

### New Capabilities

- `storefront-product-media-carousel`: Shopper navigation across selected-variant Customization Media and Gallery Media, including reset-to-customization behavior.

### Modified Capabilities

<!-- No existing global capability specs are being modified. -->

## Impact

The primary changes are in the storefront product route and `ProductGallery` UI, plus the shared `@trophy/customization-react` form callback contract and its tests. No backend or persistence contract changes are required because both media roles are already present in the storefront product read model. The change affects responsive product-detail presentation and keyboard/screen-reader labels for the new controls.
