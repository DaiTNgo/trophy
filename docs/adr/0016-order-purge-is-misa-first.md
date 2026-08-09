# 0016. Order purge is MISA-first

Date: 2026-08-09

## Context

Checkout creates a local Trophy order before a shopper has completed a bank
transfer. Operators need a manual way to permanently remove abandoned checkout
orders, while MISA is the operational system of record for sale orders.

## Decision

Only a `super-admin` may purge an order. The order must still be `pending`,
with `paymentStatus = pending` and `fulfillmentStatus = unfulfilled`.

For an order with a numeric `misaSaleOrderId`, Trophy calls `DELETE
/SaleOrders` in MISA before deleting local rows. A MISA 404 is accepted as an
idempotent result because the sale order may have been removed manually. Any
other MISA error blocks the local purge. An order that never received a MISA
sale-order ID may be purged locally.

Purge deletes only the MISA SaleOrder. It never deletes a MISA Contact. Local
order items and their media-transfer rows are removed with the order. Target R2
objects are queued for cleanup.

The existing admin cancellation control and status endpoint are removed. A
future cancellation flow must be designed as a separate MISA-synchronised
operation.

## Consequences

The flow prevents local/MISA divergence for known external sale orders, at the
cost of making MISA availability a prerequisite for their purge. A late bank
transfer after a purge has no matching Trophy order and requires manual bank
reconciliation.
