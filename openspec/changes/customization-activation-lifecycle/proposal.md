## Why

Published products currently cannot enter customization safely: enabling it can
trigger publish validation before the operator has a way to supply the required
Customization Backgrounds. The lifecycle also conflates activation,
deactivation, and irreversible deletion, making valid saved work too easy to
discard or expose in the wrong admin workflow.

## What Changes

- Add an atomic Customization Setup Session for first-time activation of a
  published product, which stages a template and every variant background until
  one successful multipart activation command.
- Define deactivation as a reversible state that keeps the template and
  Customization Background assets, while hiding those backgrounds from Variant
  Media Management.
- Add reactivation behavior: activate immediately when all current variants
  remain valid, or collect only missing backgrounds in an atomic repair session.
- Require Atomic Variant Creation, with Information and Media tabs, to include
  a valid Customization Background whenever customization is active.
- Allow permanent deletion only after deactivation and cascade its cleanup to
  customization data, background assets, Product Media references, and an
  affected Product Thumbnail.
- Keep active customization valid when a permitted variant deletion removes a
  variant and its associated background.

## Capabilities

### New Capabilities
- `customization-activation-lifecycle`: Defines the operator lifecycle for
  activating, deactivating, repairing, and permanently deleting product
  customization, including its interaction with variant creation and deletion.

### Modified Capabilities
- None.

## Impact

- Backend admin customization and variant-creation routes, validation services,
  asset cleanup, and Hono RPC contracts.
- Admin Product Detail customization controls, FocusModal setup/repair flows,
  and the variant creation and media-management interfaces.
- Product read and publishability behavior for active versus deactivated
  customization. Storefront behavior remains driven only by active
  customization.
