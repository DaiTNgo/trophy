# Storefront Customization Watermark Design

## Goal

Add a visible watermark to the storefront customization editor and preview so screenshots of an unfinished product design are less useful, while keeping admin previews and production/order data clean.

## Scope

- Show the text `phùng thị` as a repeated diagonal overlay across the product canvas in the storefront `ProductCustomizationPreview`.
- Keep the overlay visible in normal preview and fullscreen mode.
- Render it only in the storefront-facing preview component. Admin customization editors and previews remain unwatermarked.
- Do not add watermark state to customization templates, form values, cart lines, order snapshots, uploaded assets, or exported production artwork.

## Visual Treatment

- Repeat the watermark diagonally across the entire canvas.
- Use white text with `mix-blend-mode: difference` so it maintains contrast over light and dark product imagery without reading a fixed color from the image.
- Use low opacity, approximately `0.16`, so the design remains inspectable while screenshots carry the ownership mark.
- Implement the pattern with CSS text/overlay elements rather than a raster asset.

## Architecture

Add a private watermark overlay component in `packages/customization-react` and place it inside `ProductCustomizationPreview`'s canvas frame, after the design layers so it appears above the product artwork. Keep editor controls outside the overlay stacking context or at a higher z-index. Set `pointer-events: none` so panning, zooming, image movement, layer selection, and fullscreen controls continue to work normally.

This is a presentation-only concern. The component must not modify the `design`, `template`, or `values` objects and must not introduce a new API or shared customization type.

## Behavior and Edge Cases

- The watermark is always on for storefront customization previews; there is no shopper toggle.
- It remains visible when the preview is fullscreen.
- It stays clipped to the product canvas and does not cover the surrounding toolbar or page controls.
- It remains present when the background image is unavailable, since it is rendered independently from the background layer.
- The overlay must not change canvas dimensions or cause layout shift when values update.

## Verification

- Add focused component/source coverage for the watermark text, diagonal repeated overlay, and `pointer-events: none` behavior.
- Confirm customization values and design payloads are unchanged by rendering the overlay.
- Run the customization-react check and storefront typecheck/build.
- Manually verify normal and fullscreen storefront previews on desktop and mobile, including pointer interaction with an uploaded image.

