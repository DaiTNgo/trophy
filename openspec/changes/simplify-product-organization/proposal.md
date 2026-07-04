## Why

The create product Organize step currently exposes `Type`, `Categories`, `Collection`, and `Tags` as peer inputs, but the product browsing model has now been clarified: storefront navigation needs Shop by Product and Shop by Interest. Keeping all four fields in the primary create flow creates overlapping meanings and encourages inconsistent catalog data.

## What Changes

- Define `Categories` as the admin input for Shop by Product, a flat shopper-facing product-kind list.
- Define `Collection` as the admin input for Shop by Interest, a merchandising group based on occasion, audience, sport, industry, or buying intent.
- Remove `Type` from the primary create/edit product organization UI because it duplicates Shop by Product.
- Remove `Tags` from the primary create/edit product organization UI until a concrete badge, campaign, search, or workflow use case exists.
- Keep product category assignment multi-select so one product can appear in multiple Shop by Product groups.
- Keep backend `type` and `tags` fields nullable/unused for now unless later cleanup explicitly removes those contracts.

## Capabilities

### New Capabilities

- `admin-product-organization`: Admin product organization rules for Shop by Product categories, Shop by Interest collections, and removal of ambiguous type/tag inputs from primary product forms.

### Modified Capabilities

None.

## Impact

- `apps/admin`: create product and product detail organization forms should show Categories and Collection as the primary controls, with clearer labels/help text matching Shop by Product and Shop by Interest.
- `apps/backend`: no required persistence contract change for this proposal; existing nullable `typeId` and tag relationships can remain unused.
- `apps/storefront`: storefront browse surfaces can rely on categories for Shop by Product and collections for Shop by Interest.
- `CONTEXT.md`: already records Shop by Product and Shop by Interest domain terms.
