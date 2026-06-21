# Categories, Tags, And Orders Backend Design

Date: 2026-06-21
Scope: ecommerce backend taxonomy and order persistence for `apps/backend`
Status: approved for planning

## Summary

This design extends the backend data model with Medusa-like product taxonomy and persisted order storage. It intentionally excludes the storefront create-order request contract for now. The backend order model is the source of truth and stores normalized totals, addresses, and line-item snapshots.

## Goals

- Add normalized product categories with simple parent-child hierarchy.
- Add normalized product tags with flexible admin input and product join records.
- Add persisted order storage that is suitable for later storefront checkout integration.
- Keep the schema close to Medusa in the parts that matter for catalog and order history.

## Non-Goals

- Storefront request payload design for order creation.
- Payment, refund, or transaction tables.
- Shipping method, fulfillment, or return workflows.
- Deep category tree optimization such as materialized paths.

## Recommended Approach

Use a normalized relational schema with separate tables for categories, tags, orders, order items, and order addresses.

Why this approach:

- It keeps taxonomy reusable and queryable.
- It preserves historical order data through line-item snapshots.
- It leaves room for future checkout and fulfillment work without forcing a redesign.

Alternatives considered:

1. Lean schema with more JSON fields.
   Faster to scaffold but weaker for reporting and validation.
2. Broader Medusa-like model with shipping and payment tables.
   More future-proof but outside the current scope.

## Architecture

The schema is split into three backend concerns:

- `product_categories` and `product_tags` for reusable product taxonomy.
- join tables for product-to-category and product-to-tag assignments.
- `orders`, `order_items`, and `order_addresses` for persisted order history.

The backend persists a stable order model and does not assume the future storefront request payload matches it exactly.

## Schema

### Product Categories

`product_categories`

- `id`
- `name`
- `handle`
- `parent_id` nullable self-reference
- `is_active`
- `position` nullable
- `created_at`
- `updated_at`

### Product Tags

`product_tags`

- `id`
- `value`
- `created_at`
- `updated_at`

`product_tag_links`

- `product_id`
- `tag_id`

### Orders

`orders`

- `id`
- `display_id` or `order_number`
- `status` with `draft | pending | confirmed | fulfilled | canceled`
- `email`
- `customer_name` nullable
- `currency_code`
- `subtotal_amount`
- `discount_total`
- `tax_total`
- `shipping_total`
- `total_amount`
- `item_count`
- `metadata` nullable
- `placed_at` nullable
- `created_at`
- `updated_at`

`order_items`

- `id`
- `order_id`
- `product_id` nullable
- `variant_id` nullable
- `title_snapshot`
- `variant_title_snapshot` nullable
- `sku_snapshot` nullable
- `unit_price`
- `quantity`
- `subtotal_amount`
- `discount_total`
- `tax_total`
- `total_amount`

`order_addresses`

- `id`
- `order_id`
- `type` with `shipping | billing`
- `first_name`
- `last_name`
- `phone` nullable
- `address_1`
- `address_2` nullable
- `city`
- `province` nullable
- `postal_code` nullable
- `country_code`

## Data Flow

### Tags

- Admin submits tag strings.
- Backend trims and normalizes the values.
- Backend upserts records in `product_tags`.
- Backend replaces product join rows in `product_tag_links`.

### Categories

- Admin submits category ids.
- Backend validates the categories exist and are active.
- Backend replaces product join rows for category assignment.

### Orders

- Backend creates one `orders` row per persisted order.
- Backend writes one or more `order_items` rows with product and variant snapshots.
- Backend writes up to two `order_addresses` rows for shipping and billing.
- Backend computes and stores totals on the order record.

## Invariants And Error Handling

- `product_categories.handle` is unique.
- `product_tags.value` is unique after normalization.
- `product_tag_links` must be unique on `(product_id, tag_id)`.
- `order_addresses` must be unique on `(order_id, type)`.
- A category cannot reference itself as parent.
- Each order must have at least one item.
- `quantity >= 1`.
- Monetary totals must be non-negative.
- `total_amount = subtotal_amount - discount_total + tax_total + shipping_total`.
- Order status is limited to `draft | pending | confirmed | fulfilled | canceled`.

## Verification

- Update `apps/backend/src/db/schema.ts`.
- Add Drizzle migration files.
- Run `pnpm --filter backend check`.
- Run `pnpm --filter backend build`.
- Run `./init.sh`.

## TODO

- Define the storefront create-order request shape.
- Add payment and transaction persistence.
- Add shipping method and fulfillment records.
- Add richer tax and discount structures.
- Add explicit order status transition rules.
