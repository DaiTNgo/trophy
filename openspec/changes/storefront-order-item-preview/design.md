## Context

The storefront order lookup route renders every returned order item in a separate card, including product, variant, quantity, price, and non-empty customization summaries. The route has no item-level detail interaction. The backend lookup contract derives these values from immutable order snapshots and intentionally excludes raw rendered design and production data. Order creation also persists the selected variant media URL in `backgroundSnapshotJson`, but lookup currently omits it.

The storefront already uses the shadcn/Radix `Dialog` primitive. This change is limited to the shopper-facing order lookup page and must preserve the existing lookup request, response contract, and order data boundaries.

## Goals / Non-Goals

**Goals:**

- Let shoppers open a preview for exactly one order item at a time.
- Present the existing shopper-safe snapshot fields in a readable, accessible modal.
- Show the immutable thumbnail captured at purchase time before the textual fields.
- Reconstruct customized products with `ProductCustomizationPreview` using saved values and a sanitized template snapshot.
- Keep repeated products and distinct customized lines independent by selecting the item object from the rendered list rather than identifying it by product title.
- Hide customization entries whose values are empty; preserve the existing summary formatting for populated entries.
- Allow dismissal through the modal close control and the explicit `Đóng` button.

**Non-Goals:**

- No raw rendered design or production data response; the lookup contract only adds a shopper-safe preview image URL.
- No navigation to the current product detail page from the preview.
- No editing, reordering, cart mutation, or status mutation from the modal.
- No raw rendered design JSON, template snapshot, or production-only data exposure.

## Decisions

1. **Use controlled Dialog state in `order-lookup.tsx`.**
   Store the selected item (or `null`) locally and pass `open`/`onOpenChange` to the existing Dialog. This keeps the preview tied to the current lookup result and avoids adding a route or URL state for a transient interaction. A separate route would add navigation and data-loading complexity without improving the read-only use case.

2. **Render the purchase-time image snapshot.**
   Order creation stores the selected variant media URL in the product snapshot as `thumbnail`. Lookup returns that value as `previewImageUrl`, falling back to the persisted background snapshot for older orders. This avoids fetching mutable catalog media while keeping the response shopper-safe.

3. **Reconstruct customized items from a sanitized snapshot payload.**
   For customized items, lookup returns `values` and the template data required by the existing read-only `ProductCustomizationPreview` component, plus the persisted background asset. The raw rendered `design` object and production-only fields remain excluded. The modal uses the customization renderer instead of the base thumbnail for these items.

4. **Use stable item identity from the list position plus item data.**
   The current API does not expose a public order-item id. The click handler will capture the selected item from the map closure, while the rendered React key remains collision-safe for repeated product names by including the item index. No product-title lookup will be used to resolve the selected item.

5. **Keep the modal read-only and item-scoped.**
   The modal will show a clear title and structured details, followed by only a `Đóng` action. Empty customization values will not be rendered; an item with no populated values will omit that section entirely.

6. **Require the fullscreen close control.**
   Fullscreen uses a backdrop for visual separation, but the backdrop is intentionally non-dismissable. Shoppers exit fullscreen only through the visible `X` control; clicking or dragging the backdrop must not close it.

7. **Keep the lookup Dialog non-modal while supporting fullscreen portal interaction.**
   The preview Dialog uses Radix's non-modal mode so its dismissable layer cannot block pointer or focus events delivered to the customization fullscreen portal. Outside dismissal remains prevented while fullscreen is active, and the fullscreen `X` is the only exit from fullscreen.

## Risks / Trade-offs

- [The lookup response has no public item id] → Select the item object directly from the render callback and avoid title-based matching; retain a collision-safe list key.
- [Snapshot data is summary-only] → Clearly label the modal as a purchase preview and do not imply it is an editable product recreation.
- [Older orders lack a product snapshot thumbnail] → Fall back to the persisted background snapshot URL; return `null` when neither snapshot contains an image.
- [Long customization values may make the modal tall] → Use a bounded dialog content area with vertical scrolling while keeping the close action reachable.
- [Existing route has no component-level test harness for Dialog interaction] → Add focused tests around selection/rendering where the current storefront test setup supports it, and manually verify keyboard/overlay close behavior.
