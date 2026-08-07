## Context

Products currently have an `archived` publication status and a destructive `DELETE /api/admin/products/:id` lifecycle action. The active admin list reads every Product, while shopper routes select only `published` Products. The destructive route also blocks Products referenced by Order Items and admin order reads fall back to live variant customization media. This conflicts with the established Order Item Snapshot boundary.

The change affects the backend schema and route composition, admin Hono RPC consumer surface, Products UI, and admin order read model. The repository is in development mode: the schema is changed directly and no migration artifact is created.

## Goals / Non-Goals

**Goals:**
- Provide a recoverable Product Trash without conflating deletion with the existing archived status.
- Keep trashed Products out of active admin, detail, and shopper catalog surfaces.
- Restore a trashed Product only as Draft.
- Make permanent deletion an explicit Trash-only operation that can clean up synchronized MISA records.
- Make order display independent of live Product and Variant rows.
- Preserve typed Hono RPC contracts and cover public admin route behavior.

**Non-Goals:**
- Change Product archive/unpublish behavior.
- Reuse a handle while its Product remains in Trash.
- Add automatic Trash expiry, bulk actions, audit history, or a new authorization role.
- Generate or apply database migrations.
- Change the stored Order Item Snapshot payloads.

## Decisions

### Represent Trash with `deletedAt`

Add a nullable `products.deleted_at` timestamp. A non-null value defines Product Trash membership, rather than introducing a new `status` value. This keeps publication state and deletion lifecycle independent and allows a restore to deliberately overwrite the prior state with `draft`.

Alternative considered: add a `deleted` status. Rejected because it overloads the publication-state field and forces every status consumer to distinguish deletion from visibility.

### Separate active and Trash route surfaces

The normal list and `GET /:id` read only Products whose `deletedAt` is null. A dedicated `GET /trash` endpoint returns trashed Products. `DELETE /:id` soft-deletes only an active Product; `POST /:id/restore` restores only a trashed Product with status `draft`; `DELETE /:id/permanent` permanently deletes only a trashed Product.

This makes a permanent action impossible from the normal Products list. Repeating an action against an item in the wrong lifecycle state returns a typed 404 response rather than silently changing unrelated state.

### Preserve handles during Trash retention

Soft deletion leaves the existing unique handle unchanged. Create and edit validation therefore continues to reject it until the trashed Product is permanently deleted. This avoids restore-time URL collisions and requires no partial unique index.

### Delay MISA cleanup until permanent deletion

Soft delete does not call MISA. Permanent deletion reuses the existing local-first validation and MISA cleanup logic for synchronized variants, then removes local dependent Product data. A MISA cleanup failure leaves the Product in Trash and returns an error.

Alternative considered: delete MISA records during soft deletion. Rejected because it makes recovery dependent on recreating an external record, although the Product remains recoverable locally.

### Read orders from snapshots only

Admin order construction will deserialize product, variant, background, and customization snapshot fields without querying live Product Variant Customization Media. This removes the legacy fallback and allows catalog cleanup regardless of historical Orders.

### UI and client integration

Add a Products header action that links to `/products/trash` using the existing Medusa and Lucide vocabulary. The Trash route uses the same table density as Products, with explicit Restore and Delete permanently actions. It has loading, empty, failure, and disabled-action states. New route consumers use the exported backend Hono route type through `hc<AppType>()`; no new ad hoc fetch wrapper is added.

## Risks / Trade-offs

- [Existing D1 data lacks `deleted_at`] → Development-mode schema updates require the local environment to be rebuilt or schema pushed before running against persisted data; no migration is authored in this change.
- [A retained handle blocks a new Product] → Trash clearly exposes Restore and permanent deletion, while validation continues to name the conflicting handle.
- [Permanent deletion is irreversible] → Require a browser confirmation and constrain the endpoint to trashed Products.
- [Legacy orders may have incomplete snapshots] → The API returns stored snapshot data only; malformed historical snapshot data must surface as an order data error instead of falling back to current catalog media.
- [MISA cleanup fails] → Do not delete local data; retain the Product in Trash so an admin can retry permanent deletion.

## Migration Plan

1. Update the schema with `deleted_at` and deploy the current schema through the normal development environment setup.
2. Deploy backend route changes before the admin UI so the old delete action safely becomes a soft delete.
3. Deploy the admin Trash route and Hono RPC client actions.
4. Roll back by restoring affected Products from Trash before reverting the backend. The schema field can remain nullable without affecting active Products.

## Open Questions

None. The Product deletion, restoration, handle, Order Snapshot, and MISA boundaries were confirmed during design.
