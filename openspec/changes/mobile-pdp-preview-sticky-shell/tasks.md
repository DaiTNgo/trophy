## 1. Storefront mobile PDP shell

- [x] 1.1 Add a route-aware storefront flag so the mobile navbar category strip is suppressed on the product detail page without changing other shopper routes.
- [x] 1.2 Add a mobile-only preview shell wrapper in `apps/storefront/app/routes/product.$handle.tsx` that constrains the visible preview height to roughly half of the viewport.
- [x] 1.3 Add sticky activation logic for the mobile preview shell so it pins below the mobile navbar while the shopper scrolls through customization content.
- [x] 1.4 Add storefront-managed `Hide preview` / `Show preview` state and the sticky hidden-preview bar for the mobile PDP shell.
- [x] 1.5 Ensure the mobile sticky preview shell does not render for non-customizable products and does not alter desktop PDP behavior.

## 2. Shared fullscreen preview

- [x] 2.1 Add a fullscreen preview action to `packages/customization-react/src/index.tsx` without coupling it to storefront-specific shell state.
- [x] 2.2 Render the shared customization preview in a fullscreen overlay that preserves the current preview state when opened and closed.
- [x] 2.3 Keep fullscreen preview compatible with read-only consumers so viewing is allowed but edit-only controls remain suppressed.

## 3. Verification

- [ ] 3.1 Verify mobile PDP behavior manually: category strip hidden, preview shell sticky above navbar, preview shell height constrained, and `Hide preview` / `Show preview` only appear once the preview region is sticky.
- [x] 3.2 Run `pnpm --filter router-cf typecheck` and `pnpm --filter router-cf build`.
- [x] 3.3 Run `pnpm --filter @trophy/customization-react check` and `pnpm --filter admin build` to confirm the shared fullscreen action does not break other preview consumers.
