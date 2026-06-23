# Admin Sidebar Medusa Parity Design

## Scope

Update `apps/admin` so the authenticated shell navigation feels like Medusa in both structure and visual behavior:

- dark left rail instead of large descriptive cards
- compact icon-led navigation items
- nested `Collections` and `Categories` under `Products`
- bottom-pinned `Settings` and account row
- lighter, less banner-heavy content shell so page titles remain the main focus

## Decisions

- Keep the existing route tree and mock-first page data model.
- Refactor the sidebar in `apps/admin/src/App.tsx` instead of introducing a new layout system.
- Add minimal placeholder routes for `Collections` and `Categories` so the new hierarchy is clickable and coherent.
- Preserve existing admin-only routes such as `Team`, `Security`, and `Customization`, but reposition them so the commerce IA reads closer to Medusa.
- Use existing `@medusajs/ui`, `lucide-react`, and Tailwind utilities already present in the app.

## UX Shape

- The shell uses a fixed-width dark sidebar on desktop with a stacked rail layout.
- The top of the rail contains a store identity block and a non-functional search trigger row that visually matches Medusa.
- Primary navigation contains `Orders`, `Products`, `Inventory`, `Customers`, `Promotions`, and `Price Lists`, with unfinished sections rendered as placeholders.
- `Products` expands into `Collections` and `Categories` when the current route is within the products subtree.
- Trophy-specific operator routes such as `Customization` and `Team` live in a secondary section so they do not compete with the main commerce nav.
- `Settings` is pinned near the bottom of the sidebar and the signed-in account row sits below it with sign-out access.
- The main area drops the oversized shell banner in favor of a simpler top bar and content spacing closer to Medusa.

## Non-Goals

- No backend integration changes for catalog, orders, or taxonomy data.
- No collapsible mobile drawer or responsive nav state beyond basic stacking.
- No full Medusa feature implementation for placeholder pages in this slice.

## Verification

- `pnpm --filter admin build`
- `./init.sh`
