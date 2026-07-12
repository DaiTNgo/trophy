## Why

The current clipart admin experience puts category management, upload, and asset maintenance into one screen and eagerly loads category media up front. That shape does not match the rest of the admin application's list-management pattern, and it makes the clipart flow harder to scan, slower to load, and easy to misuse when building batch uploads.

## What Changes

- Add a dedicated admin clipart category list page at `/customization/clipart` that follows the same list-management pattern used by product, collection, and category screens.
- Add a dedicated admin clipart category detail page at `/customization/clipart/:categoryId` for category-specific asset management.
- Add a `Create category` header action on the list page that uses a Medusa-style `FocusModal`.
- Load clipart assets only when an admin opens a specific category detail page instead of fetching all category assets on the list page.
- Separate category detail responsibilities into category metadata, upload queue, and uploaded media sections.
- Change the pre-upload batch draft behavior so selecting additional files appends to the existing draft queue instead of replacing previously queued files.
- Keep existing clipart category, clipart asset, and batch upload domain rules intact; this change refines admin information architecture and interaction flow rather than changing the underlying clipart model.

## Capabilities

### New Capabilities
- `clipart-admin-management`: Admin list/detail management for clipart categories, lazy category asset loading, FocusModal creation flow, and append-only batch draft queue behavior.

### Modified Capabilities
- `customization-clipart-library`: Refine the admin clipart management requirement from a single combined route shape to a list/detail route model with category detail-specific asset loading.

## Impact

- `apps/admin`: clipart routes, list/detail pages, FocusModal create flow, upload queue state management, and admin navigation behavior within the clipart area.
- `apps/backend`: admin clipart category listing may need lightweight summary data for list rows, while category asset routes remain the category-detail data source.
- Existing clipart domain behavior in `packages/customization` and `apps/storefront` is not expected to change in this proposal.
