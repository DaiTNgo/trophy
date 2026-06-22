# Admin Medusa-Style Pages Design

## Scope

Implement `apps/admin` as a protected internal SPA with:

- `login` page using a real submit flow validated by `valibot`
- `orders` page backed by mock data
- `products` page backed by mock data
- local route protection for admin-only access

## Decisions

- Use `react-router` for page structure and route protection.
- Use local browser session state instead of backend auth for this iteration.
- Use `valibot` for login form validation.
- Use Tailwind CSS for rapid admin UI implementation.
- Keep data local and typed so it can later be replaced with API calls.

## UX Shape

- `login` is a standalone entry screen with demo credentials.
- `orders` and `products` live inside a shared admin shell with sidebar navigation.
- Both operational pages expose summary cards plus searchable tables.

## Non-Goals

- No backend authentication.
- No CRUD mutations yet.
- No shared API contracts with other apps in this iteration.

## Verification

- `pnpm install`
- `pnpm --filter admin build`
- `./init.sh`
