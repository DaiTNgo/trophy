## Context

`customization-clipart-library` established the clipart domain: categories own curated media assets, assets belong to exactly one category, batch upload is reviewed and atomic, and shopper clipart selection stays inside admin-controlled allowlists. The current admin implementation delivers those capabilities through a single `/customization/clipart` screen that combines category management, upload drafts, and uploaded media while also loading assets for every category during initial page load.

That implementation now conflicts with the admin app's prevailing management model. Products, collections, and categories use a list-first entry point with a clear create action and a separate detail surface for editing one entity. The clipart experience should align with that shape without changing clipart's domain rules.

## Goals / Non-Goals

**Goals:**
- Move clipart admin navigation to a list/detail route model that matches the admin app's existing management screens.
- Keep `/customization/clipart` focused on category discovery, creation, and lightweight row actions.
- Move asset upload and uploaded-media management into `/customization/clipart/:categoryId`.
- Ensure category assets are loaded lazily when a category detail page opens.
- Preserve reviewed atomic batch upload while changing draft selection behavior to append newly chosen files to the current queue.

**Non-Goals:**
- No change to shopper clipart behavior, layer allowlists, or order/cart snapshot contracts.
- No change to clipart asset file support, asset identity, or batch commit atomicity.
- No remote marketplace, bulk cross-category operations, or clipart search feature in this change.
- No attempt to redesign Brand Assets or customization template flows beyond the clipart route split.

## Decisions

### Clipart adopts list and detail routes

The admin app will use `/customization/clipart` as the category list page and `/customization/clipart/:categoryId` as the category detail page. The list page owns discovery and creation. The detail page owns one category's metadata and assets.

Alternative considered: keep one route and conditionally expand a selected category. That preserves more of the existing code, but it still mixes list and detail responsibilities and does not match the rest of the admin IA.

### Category creation uses FocusModal from the list page

The list page header will expose `Create category`, implemented with `FocusModal` to match the surrounding admin product-management patterns. On success, the admin is redirected into the new category detail page so the next action can be upload or metadata editing.

Alternative considered: inline creation form on the list page. That is workable but reads less like the rest of the admin application and competes with the list for space and attention.

### Category detail becomes the only asset-management surface

Only the detail route will show:
- category metadata/status controls
- upload queue
- uploaded media list

This keeps the list route lightweight and makes it impossible to confuse queued uploads with already persisted assets from other categories.

Alternative considered: allow uploading directly from the list page. That would reintroduce the same mixed-responsibility problem the route split is intended to solve.

### Asset loading becomes lazy per category

The admin client will no longer fetch assets for every category during the list-page load. It will fetch category assets only when the detail route mounts or when the active category needs refresh after upload, rename, or deactivate actions.

For the list page, category rows still need summary information such as active asset count. The preferred design is to extend the category-list response with summary counts so the list page does not issue N extra asset requests.

Alternative considered: compute counts client-side by loading every category's assets. That keeps backend contracts unchanged but defeats the performance and clarity benefits of the route split.

### Upload draft queues append additional selections

Within a category detail page, selecting files through the batch upload input will append new draft items to the existing queue instead of replacing it. Draft removal stays explicit per row or through a clear-queue action. Successful batch submission clears only the current queue and then refreshes the current category asset list.

Alternative considered: keep replacement behavior and require re-selection of every file before submit. That is the current pain point and is easy to misuse during repeated upload preparation.

## Risks / Trade-offs

- List rows need asset counts without eager asset loading -> extend the categories response with summary counts or document another efficient summary source.
- Route split introduces more navigation state than a single-page flow -> use a simple back-to-list affordance and redirect to detail after create so the path remains obvious.
- Appending file selections can increase queue size quickly -> support remove-per-row and clear-queue actions so recovery is explicit.
- Existing admin code likely centralizes clipart category and asset loading in one hook -> split list and detail data responsibilities cleanly to avoid reintroducing eager fetch behavior through shared abstractions.

## Migration Plan

1. Add the new `clipart-admin-management` change artifacts and validate the intended route/list-detail behavior.
2. Refactor admin routing so `/customization/clipart` becomes the category list page and `/customization/clipart/:categoryId` becomes the category detail page.
3. Update admin data loading to stop fetching all clipart assets up front and to fetch category assets only in the detail route.
4. Adjust the category-list backend response if needed to include summary counts for the list page.
5. Rework the batch upload draft queue behavior so additional file selections append to queued drafts.
6. Run targeted admin/backend verification plus `openspec validate clipart-admin-management --strict`.

Rollback is straightforward because this is an admin-only route/UI refinement in a dev-mode repository. Revert the change set if the route split or list-detail flow proves unsound before shipping.

## Open Questions

- None. The desired admin flow, modal behavior, and upload-queue semantics were settled in the working session that created this follow-up change.
