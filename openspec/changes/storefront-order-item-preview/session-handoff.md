# Session Handoff

The `storefront-order-item-preview` change is implemented and verified. The main UI is in `apps/storefront/app/routes/order-lookup.tsx`; helper logic and tests are in `apps/storefront/app/lib/order-item-preview.ts` and `.test.ts`. Backend lookup returns `previewImageUrl`, sourced from the purchase-time product snapshot and falling back to `backgroundSnapshotJson` for older orders. Customized items also include a sanitized values/template payload rendered by `ProductCustomizationPreview`. Fullscreen overrides route modal sizing, fills the viewport, captures read-only canvas drag/pinch at the viewport, closes only via `X`, prevents the parent Dialog from dismissing, suspends the parent Dialog layer while active, and uses non-modal Dialog mode so the fullscreen portal receives pointer/focus events.

All tasks in `tasks.md` are complete. No backend changes are pending. The change can be archived when desired.
