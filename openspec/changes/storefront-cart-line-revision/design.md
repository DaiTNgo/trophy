## Context

The storefront browser cart persists `CartLine` objects in local storage. A customized line already contains the selected variant ID and full customization values, but the cart only presents a product link and summary values. The product-detail page owns the normal variant, quantity, customization form, validation, and add-to-cart controls. It is server-rendered before the browser cart is available.

The new flow must restore a cart selection after refresh or in a new tab without exposing customization values in a URL, changing backend APIs, or altering checkout and order snapshots. A Cart Line Revision is a one-time add operation, not a persisted relationship between cart lines.

## Goals / Non-Goals

**Goals:**

- Let a shopper reopen any customizable cart line in the normal PDP with its variant and customization state restored.
- Preserve every PDP control and revalidate restored state against current shopper-safe catalog data.
- Add a revision as an independent browser-cart line at quantity one while leaving ordinary cart merge behavior unchanged.
- Degrade safely when the source cart line, variant, or template values are no longer valid.

**Non-Goals:**

- Editing or replacing the source cart line in place.
- Persistent server-side carts, cart-line APIs, new backend contracts, or order snapshot changes.
- Showing provenance, revision labels, or a source-line relationship in the cart.
- A separate review screen, modal, or automatic scrolling into the customization section.

## Decisions

### Use a cart-line ID query parameter as the restoration reference

The cart action will navigate to the normal generic product path with a `cartLine` query parameter containing only the browser-cart line ID. The generic product redirect will preserve the search string when it redirects to the category-qualified PDP. On the client, after `CartProvider` has hydrated local storage, PDP resolves the ID against cart lines and applies the variant and customization values once.

This keeps the URL small and avoids leaking shopper-entered names, uploads, or design data into browser history, logs, or shared links. It also survives refresh and opening in a new tab. `location.state` was rejected because it is not durable across either case, while serializing values into the query was rejected for privacy and URL-size reasons.

### Treat restoration as a one-time PDP initialization, not a separate editor

The PDP retains its current form, live preview, variant selection, quantity controls, validation, and post-add behavior. Restored values become the initial client state; the shopper can then edit them or make any ordinary PDP choice. The page remains at the top and does not introduce a review-only UI.

The revision quantity initializes to one instead of inheriting the source line quantity, preventing an accidental duplicate bulk purchase. The original cart line remains unchanged throughout the session.

### Revalidate rather than trusting restored cart data

PDP will resolve the current product/template first and merge only compatible stored values into the current template. It will surface restoration issues and block adding the revision while an incompatible variant or required customization value remains unresolved. If the source cart line is absent after hydration, PDP falls back to ordinary product defaults with a short notice. The source cart line is never modified as part of recovery.

This follows the existing shopper-safe product source of truth and prevents old cart data from bypassing current availability or customization validation. Silently replacing a missing variant or value was rejected because it could create a product the shopper did not intend to buy.

### Add revisions through an explicit force-separate cart operation

The cart helper will accept a one-time add mode used only by a restored Cart Line Revision. In that mode it creates a new random line ID and skips signature-based merge. It must not persist a revision flag or source ID on the resulting Cart Line. Ordinary PDP adds continue to use the existing product/variant/customization signature merge rule.

Persisting a source relationship was rejected because completed revisions are deliberately independent items: shoppers may buy several copies of the same product with different names or keep duplicate choices.

## Risks / Trade-offs

- [Browser storage is cleared or the source line is removed in another tab] -> Resolve only after cart hydration; fall back to normal PDP state and explain that saved customization could not be restored.
- [Published catalog/template changed after the original line was added] -> Retain compatible values, expose actionable validation errors for incompatible values, and require a valid current PDP state before add.
- [SSR initially renders default PDP state] -> Apply restoration only after browser-cart hydration and avoid server-side reads of local storage.
- [Generic product redirect drops the restoration reference] -> Explicitly retain the request search string when redirecting to the category-qualified PDP.
- [Force-separate behavior leaks into ordinary adds] -> Keep the mode transient to the cart helper call and add focused helper tests for both merge paths.

## Migration Plan

No database or API migration is required. Deploy the storefront change atomically. Existing local-storage cart lines remain readable because no persisted CartLine shape change is needed. Rollback removes the cart action; existing cart lines and checkout behavior continue to work.

## Open Questions

None. The shopper workflow, restoration behavior, invalid-data recovery, quantity policy, independent-line rule, and post-add destination have been confirmed.
