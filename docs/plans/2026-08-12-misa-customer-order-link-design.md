# MISA Customer Order Link Design

## Decision

Synchronize every Trophy checkout shopper as a personal MISA Customer. Its
stable `account_number` is `TROPHY-<normalized phone>`. The same key is used
as the Contact's `contact_code`, making retries idempotent without storing a
new local external identifier.

## Data Flow

1. Build the Customer payload from the checkout customer, billing address, and
   shipping address. Look up `/Customers/code` first and create only when
   absent.
2. Build the Contact payload with `account_name` set to the Customer code. A
   newly created Contact is therefore associated with its Customer.
3. Build the SaleOrder payload with `account_name` and `contact_name` set to
   the Customer and Contact codes. Map documented billing and shipping address
   fields directly from the persisted checkout snapshots.

## Error Handling

Customer synchronization happens before Contact and SaleOrder creation. Any
MISA rejection stops the remote sequence and remains recorded as the existing
local order's failed MISA synchronization; it never rolls back checkout. An
existing Customer is reused, including when the existing Contact is found by
email.

## Verification

Unit tests cover payload mapping, Customer reuse, new Customer creation, and
the resulting Contact and SaleOrder references. Backend tests, type checking,
and build run after the change; `./init.sh` is also run and any unrelated
baseline failure is recorded.
