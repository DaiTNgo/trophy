# MISA-first abandoned-order purge

## Scope

Replace the admin cancellation action with a permanent purge for abandoned
checkout orders. This is a manual super-admin workflow only.

## API

`DELETE /api/admin/orders/:orderNumber` returns `{ deleted: true }`.

The route requires a super-admin session and accepts only an order that remains
`pending / pending / unfulfilled`. It returns `403` for a regular admin, `404`
for an absent order, and `409` for an ineligible order or a non-numeric stored
MISA sale-order identifier. A MISA deletion failure returns `502` and leaves
the local order unchanged.

For a numeric `misaSaleOrderId`, Trophy deletes the MISA SaleOrder first. A
MISA `404` is treated as an idempotent success. No MISA call is made when the
local order has no sale-order ID. MISA Contacts are never deleted.

After the external step succeeds, the route deletes order media-transfer
assets, transfer records, order items, and the order in one D1 batch. It queues
the target R2 object keys for existing cleanup processing.

## Admin experience

The order header has no Cancel action. Eligible orders show `Purge order` only
to a super-admin. The modal warns that the operator must verify no bank
transfer has arrived, explains that MISA is deleted first, and requires exact
entry of `PURGE <orderNumber>`. Success returns to the order list; failure
keeps the order page and displays the backend message.

## Verification

Route tests cover session and role checks, missing and ineligible orders,
unsynced local purge, remote-first MISA purge, MISA 404 idempotency, MISA
failure preservation, and local dependent-row cleanup. MISA client tests cover
the SaleOrders DELETE request. Admin build verifies the removal of cancellation
and the typed purge UI.
