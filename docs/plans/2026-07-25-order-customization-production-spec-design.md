# Order customization production specification

## Goal

Make the admin order-item customization preview production-ready: render the
font family and variant selected for the frozen order, and show every text
layer's resolved print specification.

## Design

The order preview modal fetches the configured dynamic font families when it
opens and passes them to the shared preview renderer. The renderer can then
resolve each frozen text layer's font family and requested regular, bold,
italic, or bold-italic asset exactly as it did at order time.

The modal also derives a read-only production specification from every text
layer in the frozen template plus its frozen form value. Each entry includes
the layer name, final text, font-family name and selected variant, colour and
hex value, bold/italic state, alignment, resolved type size, path type,
rotation, and canvas position/size. This covers both shopper-selectable and
fixed template values.

The existing submitted-values list and uploaded-image download remain intact.
No order data, API contract, or production workflow is changed.

## Verification

Add focused unit coverage for the production-spec derivation where practical,
then run the admin build.
