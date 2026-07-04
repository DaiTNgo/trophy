# Backend route surfaces follow caller ownership

Backend routes are split by caller-facing route surface rather than by database table or implementation module. Admin app routes live under `/api/admin/*` and require an admin session by default, with `/api/admin/bootstrap` as the explicit onboarding exception; storefront routes live under `/api/storefront/*` and expose only shopper-safe runtime data. The old generic management routes are removed instead of aliased because the repository is in dev mode and keeping compatibility paths would weaken the new interface.

## Consequences

Brand assets are split into admin-only management routes and storefront-safe runtime routes, so shopper rendering never depends on a management endpoint. Scaffold-only routes such as `/api/samples` are removed when they have no product caller. Migration documentation must map removed endpoints to their canonical replacements.
