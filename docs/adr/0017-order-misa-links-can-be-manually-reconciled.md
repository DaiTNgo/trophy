# 0017. Order MISA links can be manually reconciled

Date: 2026-08-09

## Decision

Only a super-admin may connect, refresh, or disconnect a Trophy order's MISA
SaleOrder link. Disconnect is local-only: it retains the MISA SaleOrder and
Contact, clears the local SaleOrder ID and number, and records `disconnected`.

Connect and refresh are manual operations. They first look up the original
Trophy order number through MISA SaleOrders-by-code. A found record with an ID
is linked instead of recreated. If no original record exists, Trophy creates it
with the original number. On a duplicate-number response, Trophy looks it up
again before attempting revision numbers (`<order>-R2`, then higher). Network,
authentication, malformed-lookup, and other MISA failures remain `failed`; they
never cause an automatic fallback creation.

Trophy persists both the current MISA SaleOrder ID and its actual MISA
SaleOrder number, because a revision suffix can differ from the local order
number.

## Consequences

An operator can deliberately sever and restore a link without deleting MISA
history. Repeated disconnect/reconnect can create additional MISA SaleOrders
only when no reusable original record can be linked. The actions are explicit,
not scheduled retries.
