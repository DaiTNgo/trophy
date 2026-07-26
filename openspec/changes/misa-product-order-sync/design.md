## Context

The current branch has local Trophy product and order flows but no MISA client. MISA v2 authenticates through `POST /Account`, then expects a bearer token and `Clientid` header on resource calls. Product codes are represented by Trophy variant SKUs. The admin app already communicates with the backend through protected routes, and backend API work requires route-level contract tests.

The operator will provide the database migration for `product_variants.misa_product_id` before deployment. The implementation must not generate or modify migration files.

## Goals / Non-Goals

**Goals:**

- Keep MISA credentials and bearer tokens server-side.
- Make product publish idempotent by checking MISA product codes before creating products.
- Store returned MISA IDs so deletion does not normally require a second SKU lookup.
- Send a checkout-created order and its contact to MISA using the product SKU as `product_code`.
- Provide an admin-only MISA proxy and a separate lookup UI for debugging.

**Non-Goals:**

- Archive or inactive synchronization.
- MISA order tracking/status polling from storefront or admin.
- Replacing MISA CRM/product management with a Trophy CRM.
- Authoring the D1 migration.
- Exposing the MISA bearer token to the browser.

## Decisions

- **Backend-direct MISA calls for business flows.** Publish and checkout call the shared backend MISA service directly. The admin proxy is reserved for explicit operator debugging, avoiding a browser round trip for business operations.
- **SKU is the MISA product code.** Each Trophy variant must have a non-empty SKU before publish or order sync can succeed. This keeps product mapping deterministic.
- **Minimal create payload.** Product creation initially sends only `product_code`, `product_name`, and `inactive: false`, matching the agreed validation probe and avoiding unsupported field assumptions.
- **ID-first deletion with legacy fallback.** New synced variants use their stored numeric MISA IDs. Variants without an ID use a SKU lookup fallback so previously created Trophy data can still be handled.
- **Local order first, MISA second.** Checkout persists the Trophy order before attempting MISA synchronization. MISA failure is recorded on the order and does not roll back the shopper's successful local order.
- **Proxy token isolation.** Proxy routes acquire tokens on the server and return MISA operation data without returning credentials or bearer tokens.

## Risks / Trade-offs

- [MISA validation differs between tenants] -> Surface MISA response and nested validation messages, keep the create payload minimal, and cover logical failure responses in tests.
- [MISA succeeds but Trophy persistence fails] -> Persist IDs immediately after lookup and make publish idempotent so retrying does not create duplicate MISA products.
- [MISA order sync fails after checkout] -> Store sync status/error/attempt metadata and expose enough admin data for retry/debugging in a later scope.
- [Operator migration is missing] -> Fail deployment verification with a clear prerequisite and document the expected column shape; do not silently fall back to an untracked schema.
- [Product deletion conflicts with historical orders] -> Reject deletion when `order_items.product_id` references the product and require operators to retain it locally.
