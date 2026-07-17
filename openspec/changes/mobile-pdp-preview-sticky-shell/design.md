## Context

The storefront product detail page already composes the shared customization preview and form directly inside `apps/storefront/app/routes/product.$handle.tsx`. The preview interaction model itself lives in `@trophy/customization-react`, while shopper page layout and navigation concerns live in storefront route and layout components such as `Navbar.tsx`.

On small screens, the current storefront shell still renders the category strip beneath the navbar, which reduces the vertical space available for the product detail experience before shoppers reach the preview and customization controls. The preview is also part of the normal document flow, so once shoppers scroll into the form they lose immediate access to the live design preview.

This change spans multiple modules:

- storefront PDP route layout
- storefront navbar/mobile shell behavior
- shared preview controls in `@trophy/customization-react`

That cross-boundary scope is why this design is worth documenting before implementation.

## Goals / Non-Goals

**Goals:**
- Keep the mobile preview accessible while shoppers scroll through customization controls.
- Reduce wasted vertical space on mobile PDP by removing the category strip under the navbar.
- Let mobile shoppers explicitly hide or show the preview shell without leaving the PDP flow.
- Keep fullscreen preview as a shared preview capability, not a storefront-only layout trick.
- Preserve current desktop PDP behavior.

**Non-Goals:**
- No redesign of the desktop PDP layout.
- No storefront-managed full-screen expansion state for the preview shell.
- No attempt to move mobile sticky/show-hide layout behavior into `@trophy/customization-react`.
- No admin-specific layout changes beyond tolerating the new shared fullscreen action.

## Decisions

### 1. Storefront owns the mobile sticky preview shell

The mobile sticky/show-hide preview shell will be implemented in `apps/storefront/app/routes/product.$handle.tsx`, not in `@trophy/customization-react`.

Why:
- The shared package already behaves like a preview surface rendered inside a caller-owned container.
- Sticky positioning, preview shell height, and show/hide bar behavior are PDP page-layout concerns.
- The admin also consumes the shared package and should not inherit storefront-specific mobile shell behavior.

Alternative considered:
- Put sticky and show/hide state into the shared package.
- Rejected because it would mix page-layout concerns into a preview component used by multiple consumers.

### 2. Mobile PDP preview uses only shown/hidden states

The storefront mobile shell will have only:

- `shown`
- `hidden`

There will be no storefront-managed expand/collapse spectrum beyond that.

Why:
- The user explicitly wants `Hide preview` / `Show preview`, not a multi-state shell.
- A binary state is easier to reason about and less likely to create layout glitches on mobile.

Alternative considered:
- A partially collapsed shell with separate expanded/full states.
- Rejected because it adds UI states without a corresponding user need.

### 3. Fullscreen belongs to the shared preview package

`@trophy/customization-react` will add a fullscreen preview action that opens the preview in an overlay.

Why:
- Fullscreen is a preview capability, not a storefront mobile layout behavior.
- This keeps fullscreen reusable for future preview consumers.
- The storefront shell remains focused on mobile PDP page structure.

Alternative considered:
- Make fullscreen a storefront-only shell mode.
- Rejected because it would duplicate preview capability in the wrong boundary and limit reuse.

### 4. Mobile navbar category strip is route-aware, not globally hidden

The storefront should suppress the category strip only for the product detail page on mobile.

Why:
- The category strip remains useful on other shopper routes.
- Route-aware suppression is safer than broad CSS hiding and preserves existing listing/home navigation behavior.

Alternative considered:
- Hide the category strip globally on all mobile pages.
- Rejected because it would change unrelated shopper flows.

### 5. Sticky activation should be driven by viewport position, not manual scroll math alone

The storefront preview shell should use a clear sticky trigger, likely through a sentinel element or `IntersectionObserver`, to determine when the preview is in the sticky region.

Why:
- It is easier to reason about than hard-coded scroll thresholds.
- It decouples sticky activation from exact content height above the preview.

Alternative considered:
- Rely on window scroll offsets only.
- Rejected because navbar height and changing PDP content would make those thresholds brittle.

## Risks / Trade-offs

- **Sticky stacking conflicts** → The mobile preview shell could fight with the navbar if top positioning and layering are wrong.  
  Mitigation: pin the shell at `top: 0` with a higher z-index than the navbar and verify the sticky handoff on mobile breakpoints.

- **Scroll jump when hiding/showing preview** → Toggling preview visibility may move surrounding content abruptly.  
  Mitigation: keep a stable sticky bar when hidden and preserve shell space transitions intentionally.

- **Fullscreen shared change affects admin preview consumers** → Adding fullscreen controls to the shared preview may surface behavior in admin that needs review.  
  Mitigation: keep fullscreen capability compatible with read-only mode and verify `pnpm --filter admin build`.

- **Overlapping sticky UI on mobile** → The preview shell could conflict with mobile PDP bottom actions or browser chrome.  
  Mitigation: keep the shell height constrained and validate spacing against the mobile action bar.

- **Two-layer responsibility increases coordination** → Storefront shell behavior and shared fullscreen behavior are implemented in separate modules.  
  Mitigation: keep the contract simple: storefront owns outer shell, shared package owns inner preview capabilities.

## Migration Plan

No data migration is required.

Implementation should proceed in this order:

1. Add route-aware mobile category-strip suppression for PDP in storefront layout/navbar code.
2. Add the mobile sticky preview shell wrapper in `product.$handle.tsx`.
3. Add the shared fullscreen preview action and overlay in `@trophy/customization-react`.
4. Verify storefront mobile behavior and shared preview consumer compatibility.

Rollback strategy:

- Revert the storefront PDP shell and navbar suppression independently if sticky/show-hide behavior causes regressions.
- Revert the shared fullscreen action independently if it creates preview consumer issues.

## Open Questions

- The final mobile preview shell height still needs implementation tuning, but the design target is around half of the viewport height.
- The exact visual treatment of the sticky hidden bar (`Show preview`) can be finalized during implementation as long as it remains slim, persistent, and only appears after the preview region has entered the sticky state.
