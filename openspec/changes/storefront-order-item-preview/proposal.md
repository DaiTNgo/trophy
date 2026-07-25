## Why

The storefront order lookup currently shows purchased items inline, but shoppers cannot inspect one item separately when an order contains multiple products or different customizations. A focused preview makes it easier to verify exactly what was purchased without navigating to the mutable product catalog.

## What Changes

- Add a per-item `Preview` action to each product row in the storefront order lookup result.
- Open a read-only modal for the selected order item.
- Show the thumbnail captured at purchase time in the modal, before the textual details.
- For customized products, render the saved customization snapshot with the existing read-only customization preview component instead of showing only the base thumbnail.
- Display the immutable shopper-safe item snapshot already returned by order lookup: product name, variant, SKU when available, quantity, line price, and customization values with non-empty values only.
- Provide only a `Đóng` action for dismissing the modal; no edit, reorder, or order mutation actions.
- Keep the preview scoped to the selected item when an order contains repeated products or multiple customized lines.

## Capabilities

### New Capabilities

- `order-item-preview`: Shopper-facing per-item preview modal in storefront order lookup.

### Modified Capabilities

<!-- No existing capability requirements change; the existing order lookup response already provides the required shopper-safe snapshot fields. -->

## Impact

- `apps/storefront/app/routes/order-lookup.tsx`: add selected-item state, preview actions, and modal rendering.
- `apps/storefront/app/components/ui/dialog.tsx`: reuse the existing shadcn Dialog primitives; no new dependency expected.
- `apps/storefront/app/lib/api.ts`: expose the lookup item's `previewImageUrl`.
- `apps/backend/src/routes/storefront/orders.ts`: snapshot the selected variant thumbnail at order creation, expose it as `previewImageUrl`, and expose a sanitized customization render payload for customized items, with a background snapshot fallback for older orders.
- Storefront UI tests should cover opening the correct item preview, hiding empty customization values, and closing the modal.
