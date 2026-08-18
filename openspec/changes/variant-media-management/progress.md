# Progress

## 2026-08-07

- Proposal, design, capability spec, and implementation tasks are complete.
- The change owns independent media management for persisted Product Variants.

## Implementation Progress

- Replaced the source Product Media model with `assetId` associations and added nullable `products.thumbnailAssetId`.
- Product Media is now thumbnail-only: a product-owned upload becomes the thumbnail immediately, or an operator selects a Variant Media/Customization Background asset directly.
- Added Variant Media Management upload/delete/background replacement routes. Variant delete/background replacement clear a matching thumbnail.
- Replaced the Product Detail Media modal with Product Media management and added `Manage media` per persisted variant. Variant Details no longer holds media draft state or media controls.
- The basic variant FocusModal validates background dimensions client-side before calling the server. Gallery Media intentionally has no reorder behavior; retry controls remain incomplete.
- The admin uses `backendFetch` for the new commands because the currently exported Hono client type does not expose form/json inputs for these mounted routes. This is a documented temporary exception; convert to Hono RPC once route typing is corrected.

## Verification

- `./init.sh` passed on 2026-08-07.
- Backend unit/API suite: 163 tests passed.
- No route-specific contract tests yet exist for the new media commands.
- On 2026-08-08, local D1 migration `0027_dazzling_midnight.sql` applied successfully after rebuilding `product_media` instead of adding a required `asset_id` column in place. Schema verification confirms `product_media` has `asset_id` and `products` has nullable `thumbnail_asset_id`.
- On 2026-08-08, the Variant Media modal was fixed to resolve its selected variant from refreshed product state by ID, so successful delete/upload/replace commands update the open modal immediately.
- On 2026-08-08, Gallery Media append was fixed to use `max(position) + 1` rather than row count, preventing unique-position collisions after deleting an earlier asset.
- On 2026-08-08, Variant Media commands changed their response contract from `{ item: Product }` to `{ variant }`, containing only the changed variant's ID, Gallery Media, and Customization Background. Admin patches that variant into Product Detail state without a follow-up product GET request.

## Next Step

Finish route contract tests and transactional/compensating cleanup, add retry UI, then choose and apply the required local D1 schema update. No migration was created under the repository's development-mode policy.
