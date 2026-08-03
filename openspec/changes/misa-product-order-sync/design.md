## Context

Trophy has local product and order flows plus a shared MISA client. MISA v2 authenticates through `POST /Account`, then expects a bearer token and `Clientid` header on resource calls. A MISA product corresponds to one Trophy variant and uses the stable Trophy variant ID as its product code. The admin app already communicates with the backend through protected routes, and backend API work requires route-level contract tests.

The operator will provide the database migration for `product_variants.misa_product_id`, `misa_sync_status`, `misa_last_error`, and `misa_synced_at` before deployment. The implementation must not generate or modify migration files.

## Goals / Non-Goals

**Goals:**

- Keep MISA credentials and bearer tokens server-side.
- Make MISA creation idempotent by checking the variant-ID product code before creating products.
- Store per-variant MISA state so create, update, retry, and deletion use the known external record.
- Send a checkout-created order and its contact to MISA using the stable Trophy variant ID as `product_code`.
- Provide an admin-only MISA proxy and a separate lookup UI for debugging.

**Non-Goals:**

- Archive or inactive synchronization.
- MISA order tracking/status polling from storefront or admin.
- Replacing MISA CRM/product management with a Trophy CRM.
- Authoring the D1 migration.
- Exposing the MISA bearer token to the browser.

## Decisions

- **Backend-direct MISA calls for business flows.** Publish and checkout call the shared backend MISA service directly. The admin proxy is reserved for explicit operator debugging, avoiding a browser round trip for business operations.
- **Variant ID is the MISA product code.** MISA `product_code` is the string form of `product_variants.id`; SKU remains operational Trophy data and is not required for MISA product synchronization.
- **Fixed MISA product form.** Every create and update sends `product_code`, `product_name` (`Product title - Variant title`), `inactive: false`, `usage_unit: "Cái"`, `product_properties: "Hàng hóa"`, and `form_layout: "Mẫu tiêu chuẩn"`.
- **Local-first product lifecycle.** MISA is attempted after a product is locally published or saved with an affected published variant. A MISA error records `failed` for only that variant and never reverses local save or publish.
- **Per-variant lifecycle state.** A variant records `pending`, `synced`, or `failed`, its numeric MISA product ID, latest error, and successful synchronization time. There is no automatic retry in this change.
- **ID-first deletion.** A synced variant is deleted from MISA by its stored numeric MISA ID only after Trophy confirms it has no historical order items; local deletion follows MISA success.
- **Local order first, MISA second.** Checkout persists the Trophy order before attempting MISA synchronization. MISA failure is recorded on the order and does not roll back the shopper's successful local order.
- **Proxy token isolation.** Proxy routes acquire tokens on the server and return MISA operation data without returning credentials or bearer tokens.

## Risks / Trade-offs

- [MISA validation differs between tenants] -> Surface MISA response and nested validation messages, keep the create payload minimal, and cover logical failure responses in tests.
- [MISA succeeds but Trophy persistence fails] -> Persist IDs and state immediately after each successful variant result; the later retry flow can safely check the stable variant-ID product code.
- [MISA order sync fails after checkout] -> Store sync status/error/attempt metadata and expose enough admin data for retry/debugging in a later scope.
- [Operator migration is missing] -> Fail deployment verification with a clear prerequisite and document the expected MISA ID/state column shape; do not silently fall back to an untracked schema.
- [Product deletion conflicts with historical orders] -> Reject deletion when `order_items.product_id` references the product and require operators to retain it locally.
