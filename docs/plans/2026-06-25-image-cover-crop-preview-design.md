# Image Cover Crop Preview Design

## Scope

Uploaded media inside `icon_picker` and `image_upload` blocks should render with a cover fit inside the administrator-defined block bounds. Shoppers and admin Preview mode users may adjust the uploaded image inside that fixed block by panning on the preview and changing image zoom from the form control.

Admin Edit mode remains block-authoring only: operators set block position and size. They do not scale, crop, or reposition shopper images in Edit mode.

## Data Model

`UploadedMediaValue` stores immutable asset identity plus optional crop metadata:

- `cropScale`: zoom multiplier above the cover baseline, minimum `1`
- `cropXRatio`: horizontal pan ratio where `0` is centered
- `cropYRatio`: vertical pan ratio where `0` is centered

The derived image layer carries those values so Konva preview and export serializers can render the same crop intent.

## Preview Behavior

Uploaded images use cover fit against the block rectangle. Overflow is clipped to the block bounds. Users can drag the image inside the clipped block to adjust pan and use a zoom control in the form. Preset icon/image choices continue to render from the configured asset option without exposing crop controls.

## Verification

Add shared tests for uploaded crop metadata flowing into image layers. Verify admin and storefront builds after implementation.
