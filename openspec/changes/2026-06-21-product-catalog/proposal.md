# Product Catalog Backend Proposal

## Why

The backend needs a product model that follows Medusa's core catalog mental model without inheriting Medusa's full operational surface. The current backend scaffold does not yet define the final v1 boundary for product entities, taxonomy relations, and variant pricing. We also need a structure that can support future product customization without redesigning the core catalog.

## What Changes

- Add a Medusa-thin product domain model to the backend design.
- Make `product_variants` the sole owner of sellable price data.
- Support optional product detail fields: `subtitle`, `description`, `media`, and `attributes`.
- Treat `handle` as optional in admin input but auto-generate and persist a unique handle on create.
- Support `collection` as an optional catalog relation in v1.
- Support `categories` as optional taxonomy relations in v1.
- Separate variant options from descriptive product attributes.
- Defer product customization to a future dedicated module.
- Explicitly exclude Medusa-full features from v1, including sales channels, shipping profiles, inventory kits, bundle behavior, and multi-region or multi-currency pricing.

## Impact

- Backend API planning can proceed with a normalized catalog schema.
- Admin product workflows can be implemented without branching data models for single-variant vs multi-variant products.
- Future customization work can attach to products cleanly through separate tables.
