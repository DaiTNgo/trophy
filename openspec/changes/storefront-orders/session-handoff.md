# Session Handoff

## Current Status
- Feature implementation for `storefront-orders` is **complete**.
- Tests pass, typechecks pass, builds pass (`./init.sh` runs cleanly).
- Storefront wiring added to checkout, correctly interacting with backend.

## Next Steps for New Session
- If the feature is accepted, run `openspec archive storefront-orders`.
- Look at `feature_list.json` for the next available task.

## Files to Review (For Context)
- `apps/backend/src/db/schema.ts` (Order tables)
- `apps/backend/src/routes/storefront/orders.ts` (Route logic)
- `apps/storefront/app/routes/checkout.tsx` (Checkout Form wiring)
- `apps/storefront/app/lib/api.ts` (API Client helper)
