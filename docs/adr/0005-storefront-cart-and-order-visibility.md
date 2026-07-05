# Storefront Cart And Order Visibility

Storefront cart state is browser-owned and stored locally until checkout, while the backend remains authoritative for product validity, prices, order snapshots, and order lookup responses. Public order lookup requires both order number and customer phone, and admin order list/detail reads real backend orders through an authenticated admin route surface so storefront-created orders are operationally visible without exposing internal snapshots publicly.

**Consequences**

The storefront needs a cart-line resolver endpoint to hydrate browser cart lines before checkout, but order creation still performs final validation. Checkout has no shopper payment step; it creates a manual payment order for operator follow-up. Admin order management starts as read-only backend visibility, with status transitions and production review left for later changes.
