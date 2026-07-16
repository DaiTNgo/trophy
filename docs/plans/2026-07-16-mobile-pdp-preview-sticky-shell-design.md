# Mobile PDP Preview Sticky Shell Design

Date: 2026-07-16

## Summary

Adjust the storefront product detail page on small devices so the preview uses less vertical space, stays accessible while the shopper scrolls through customization fields, and avoids wasting space on the mobile category strip. Keep the page-layout behavior in storefront code, and add fullscreen preview as a shared preview capability in `@trophy/customization-react`.

## Problem

The current mobile product detail page uses the same broad storefront shell as other shopper routes, including the category strip below the navbar. On small screens, that costs too much vertical space before the shopper reaches the actual product preview and customization controls.

The preview is also currently part of the normal page flow. Once the shopper scrolls into the form, they lose immediate access to the live preview unless they scroll back up. That makes mobile customization harder than it needs to be.

## Goals

- Remove the category strip from the mobile storefront navbar on the product detail page.
- Keep the preview accessible while the shopper scrolls through mobile customization controls.
- Limit the mobile preview shell to about half of the viewport height instead of letting it dominate the screen.
- Let the shopper explicitly hide or show the mobile preview shell.
- Add a shared fullscreen preview action inside `@trophy/customization-react`.
- Keep desktop behavior unchanged.

## Non-Goals

- No desktop PDP layout redesign.
- No admin layout changes.
- No attempt to move storefront mobile sticky/show-hide behavior into the shared package.
- No new shared mobile-specific sticky shell abstraction.

## Core Decision

Split responsibility by boundary:

- **Storefront PDP** owns mobile page layout behavior:
  - hide mobile category strip on PDP
  - sticky preview shell on mobile
  - preview show/hide state on mobile
- **`@trophy/customization-react`** owns preview interaction behavior:
  - existing canvas and form interactions
  - new fullscreen preview action

This keeps the shared package focused on preview behavior and avoids baking storefront PDP layout assumptions into a package also consumed by admin.

## Mobile Behavior

### Preview shell

On small devices, the product preview renders inside a storefront-owned mobile shell.

- The preview shell should use roughly half of the viewport height when visible.
- The shell should not expand to full-screen through storefront layout state.
- The visible shell should become sticky once the shopper scrolls into the preview/customization region.

Suggested sizing:

- target around `50vh`
- clamp with a reasonable `min-height` and `max-height`

The exact numbers can be tuned during implementation, but the design intent is "large enough to see the product clearly, small enough to leave room for form controls."

### Sticky behavior

When the shopper scrolls to the preview area on mobile:

- the preview shell should stick below the mobile navbar
- the form and rest of the PDP continue to scroll underneath

Sticky behavior should only apply on the product detail page and only on small breakpoints.

### Show / hide behavior

The preview shell has only two storefront-level states:

- `shown`
- `hidden`

When `shown`:

- the shell renders the preview at the mobile shell height
- the shell exposes a `Hide preview` action

When `hidden`:

- the full preview shell is removed from the sticky area
- a slim sticky bar remains visible
- the bar exposes a `Show preview` action

There is no storefront-managed "expand to full" or "collapse to partial" mode beyond this.

## Fullscreen Preview

Fullscreen belongs to the shared preview package, not to the storefront shell.

`@trophy/customization-react` should add a fullscreen preview action that:

- opens the preview in a full-screen overlay
- works independently of the storefront mobile shell state
- remains compatible with current preview controls and selection behavior

This should be treated as a preview capability rather than a product-page layout mode.

Read-only behavior can still allow fullscreen viewing, but must continue to suppress edit-only controls where appropriate.

## Storefront Architecture

### Product detail route

Primary file:

- `apps/storefront/app/routes/product.$handle.tsx`

This route already composes:

- `ProductCustomizationPreview`
- `ProductCustomizationForm`

That makes it the correct place to add the mobile-only preview shell wrapper and manage PDP-specific preview state.

Expected new storefront state:

- `isMobilePreviewHidden`
- `isMobilePreviewSticky`

Potential implementation support:

- sticky sentinel or `IntersectionObserver`
- mobile-only wrapper container around the shared preview

### Navbar behavior

Primary file:

- `apps/storefront/app/components/layout/Navbar.tsx`

Current navbar behavior includes a category strip below the header for shopper browsing. That strip should be suppressed on mobile only for the product detail page.

This should be implemented via route-aware storefront layout behavior, not by hard-coded CSS hiding that would affect unrelated routes.

## Shared Package Architecture

Primary file:

- `packages/customization-react/src/index.tsx`

The shared package should stay mostly unchanged for page layout. It should not gain storefront sticky/show-hide responsibilities.

The intended package-level change is limited to:

- add a fullscreen preview action
- render fullscreen overlay state around the preview canvas

The shared component should continue to size itself to the container provided by storefront.

## Recommended Structure

### Storefront

- Mobile PDP wrapper around the shared preview
- Route-specific flag to suppress navbar category strip on mobile
- Sticky bar for `Show preview` when hidden

### Shared preview

- Fullscreen action in the preview controls
- Fullscreen overlay rendering

## Edge Cases

- Sticky top offset must account for the mobile navbar height so the preview does not slide under it.
- Showing or hiding the preview should not create severe scroll jumps.
- Sticky preview shell should not conflict with any mobile bottom action bar on the PDP.
- Products without customization should not opt into the mobile sticky preview shell.
- Fullscreen overlay should remain usable when the preview shell itself is hidden.
- Read-only preview must not reveal edit actions in fullscreen mode.

## Verification

Manual checks should cover:

- mobile PDP no longer renders category strip below navbar
- preview shell appears at approximately half-screen height
- preview sticks below navbar while scrolling through form content
- `Hide preview` swaps the visible shell for a slim sticky `Show preview` bar
- `Show preview` restores the preview shell
- fullscreen action opens the shared preview in a full-screen overlay

Recommended verification commands after implementation:

- `pnpm --filter router-cf typecheck`
- `pnpm --filter router-cf build`
- `pnpm --filter @trophy/customization-react check`

Add admin build verification if fullscreen preview changes touch shared code paths used by admin:

- `pnpm --filter admin build`

## Recommendation

Implement the mobile sticky/show-hide preview shell entirely in storefront PDP code, and add fullscreen preview as the only shared-package change. That matches the current architecture cleanly and avoids overloading `@trophy/customization-react` with page-specific mobile layout concerns.
