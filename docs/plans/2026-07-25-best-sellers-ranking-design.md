# Best-sellers ranking design

## Goal

Make `GET /api/storefront/collections/best-sellers/products` a virtual
best-sellers route. It must not require a `product_collections` row with the
`best-sellers` handle.

## Selection order

The route produces one ordered, de-duplicated product stream:

1. Published products assigned to the `best-sellers` collection, if that
   collection exists.
2. Remaining published products ranked by total `order_items.quantity` across
   every created order, descending.
3. Remaining published products as a no-sales fallback.

Every source applies the same `customizable=all|true|false` filter. The
`true` filter requires an enabled `product_customizations` row; `false`
excludes products with an enabled row. Products that occur in an earlier source
are excluded from later sources. Ties inside a source use product id descending
to keep results deterministic.

Pagination is applied after the sources are combined. `total` represents the
number of distinct eligible products in the complete stream.

## Scope

Only the `best-sellers` branch changes. Ordinary
`/api/storefront/collections/:handle/products` routes continue to require and
return the named collection.

## Error handling and tests

The existing validation response remains unchanged. API contract coverage will
prove that a missing `best-sellers` collection returns matching published
fallback products, collection products take precedence, sales fill remaining
slots, duplicate products are omitted, and `customizable` filters apply to all
three sources.
