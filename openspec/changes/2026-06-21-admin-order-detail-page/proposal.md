# Admin Order Detail Page Proposal

## Why

The admin needs a Medusa-like order detail page so operators can inspect a single order in full operational context. The current order list is not enough to handle fulfillment, payment review, customer context, and timeline visibility.

## What Changes

- Add a Medusa-like order detail page to the admin spec.
- Define block-based order detail anatomy for summary, items, customer, payment, fulfillment, and activity.
- Define mock-first contracts for loading an order detail record and performing status-oriented admin actions.

## Impact

- Frontend teams can build order detail screens with a stable page model.
- Backend planning can target an order aggregate suited to operations workflows.
- Mock data can support realistic admin review flows before live integrations exist.
