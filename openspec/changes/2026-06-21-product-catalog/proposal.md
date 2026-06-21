# Product Catalog Backend Proposal

## Why

The backend needs a product model that behaves like Medusa for core catalog management. The current backend scaffold does not yet define product entities, taxonomy relations, or variant pricing rules. We also need a structure that can support future product customization without redesigning the core catalog.

## What Changes

- Add a Medusa-like product domain model to the backend design.
- Make `product_variants` the sole owner of sellable price data.
- Support optional product detail fields: `subtitle`, `description`, `media`, and `attributes`.
- Treat `handle` as optional in admin input but auto-generate and persist a unique handle on create.
- Support `type` and `collection` as optional single relations.
- Support `categories` and `tags` as optional many-to-many relations.
- Separate variant options from descriptive product attributes.
- Defer product customization to a future dedicated module.

## Impact

- Backend API planning can proceed with a normalized catalog schema.
- Admin product workflows can be implemented without branching data models for single-variant vs multi-variant products.
- Future customization work can attach to products cleanly through separate tables.
