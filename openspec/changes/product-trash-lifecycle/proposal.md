## Why

Admin currently hard-deletes Products from the active catalog, which gives operators no recovery window and prevents them from reviewing removed catalog records. The existing delete flow also treats live Product data as necessary for historical orders, despite Order Item Snapshots being the source of truth for purchased items.

## What Changes

- Replace the active catalog's Product delete action with a soft delete that moves the Product to an admin-only Trash.
- Add a Products Trash route where admins can review trashed Products, restore a Product as Draft, or permanently delete it after explicit confirmation.
- Exclude trashed Products from normal admin catalog reads, Product detail reads, and shopper-facing catalog access while retaining their unique handles during the recovery period.
- Allow permanent deletion even when the Product has historical Orders; remove the admin-order live customization-media fallback so Orders render only from their immutable snapshots.
- Retain synchronized MISA Product Records during soft deletion and remove them only as part of permanent deletion.
- **BREAKING**: `DELETE /api/admin/products/:id` changes from permanent deletion to soft deletion. Permanent deletion moves to a dedicated Trash-only endpoint.

## Capabilities

### New Capabilities
- `admin-product-trash`: Admin Product soft deletion, Trash management, restoration, and permanent deletion behavior.
- `order-snapshot-isolation`: Order rendering from immutable snapshots without live Product or Variant fallback reads.

### Modified Capabilities
- None.

## Impact

- Backend schema and admin Product route modules, including Hono RPC contracts and route tests.
- Admin Products routes, product client, list UI, and a new Trash screen.
- Admin order read model and its contract coverage.
- MISA cleanup timing for permanently deleted Products.
- No new dependency or database migration is included; this repository is in development mode and the schema is the current contract.
