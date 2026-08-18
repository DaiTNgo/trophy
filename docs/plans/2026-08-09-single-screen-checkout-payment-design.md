# Single-Screen Checkout Payment Design

## Decision

Checkout creates the local order only after the shopper submits the completed form. The storefront then remains on `/checkout` and replaces the form with payment instructions or COD confirmation.

## Flow

1. The shopper enters customer, shipping, VAT, note, and payment method data.
2. The backend validates the cart, persists an unpaid order, and sends its order number to MISA as `sale_order_no`.
3. The backend returns a seven-day HMAC-signed access token that is scoped to that order number.
4. The storefront redirects to the same checkout route with the order number and token. It reads only the payment-instruction endpoint and displays `PT-<order id>` for bank reconciliation.

## Security

The token payload contains only the order number and expiry. The signature uses a domain-separated key derived from the existing Better Auth secret. The payment-instruction endpoint returns no customer, address, order items, or customization preview, and rejects invalid or expired tokens.

## Invoice Boundary

The transfer reference is the short Trophy order ID, not an invoice number. The full Trophy order number remains the MISA sale-order number. An invoice request remains a separate post-order workflow.
