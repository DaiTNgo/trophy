# Storefront Orders Progress

## Current State

- Created OpenSpec change `storefront-orders` from the agreed order creation contract.
- Proposal, design, specs, and tasks are present.
- Domain glossary terms and ADR `docs/adr/0004-order-item-snapshots.md` record the key ordering decisions:
  - orders can contain multiple items;
  - backend captures price at request time;
  - Contact Price items cannot create orders;
  - customizable items require customization values;
  - item snapshots are immutable;
  - manual payment uses bank transfer or cash on delivery;
  - customized items start pending production review.

## Next Step

- Validate the OpenSpec change with `openspec validate storefront-orders --strict`.
- When implementation starts, begin with schema and backend route contract tests before wiring storefront checkout.

## Blockers

- None.

## Open Assumptions

- Currency is `VND`.
- Online payment integration is out of scope.
- Contact Price products use a separate contact/inquiry flow, not order creation.
