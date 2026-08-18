## Why

The Product Detail setup modal exposes Customization Media staging and the
template editor at the same time. Operators can begin authoring before all
variant media is valid, and the embedded editor is visibly smaller than the
Create Product editor.

## What Changes

- Split the Product Detail initial-setup and repair modal into `Custom media`
  and `Custom editor` tabs.
- Show staged media in a variant/custom-media table.
- Disable `Custom editor` until every affected variant has valid staged media
  with a shared canvas size.
- Render the enabled editor using the same available modal dimensions as Create
  Product customization.
- Keep current client and server submit validation as the final activation or
  repair guard.

## Capabilities

### New Capabilities

<!-- None. -->

### Modified Capabilities

- `customization-activation-lifecycle`: Product Detail setup and repair
  sessions must gate template authoring on complete, valid staged Customization
  Media.

## Impact

- Admin Product Detail's customization setup/repair FocusModal and its focused
  client-side validation tests.
- No backend route, persistence, Hono RPC contract, or storefront behavior
  changes.
