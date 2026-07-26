## 1. Asset Lifecycle Data and Upload Behavior

- [ ] 1.1 Add explicit temporary/retained lifecycle fields and an expiry-query index to the customization asset data model, leaving existing non-shopper assets outside the new policy.
- [ ] 1.2 Update the storefront shopper-upload route to create temporary assets with an expiry exactly 14 days after upload.
- [ ] 1.3 Add a backend lifecycle helper that identifies eligible shopper upload asset IDs from an accepted customization snapshot and promotes them to retained state.
- [ ] 1.4 Update order creation so a successfully created order retains its referenced temporary shopper uploads consistently with the order write, while failed checkout leaves them temporary.

## 2. Expiry Access and Storefront Recovery

- [ ] 2.1 Update customization-asset content and preview serving to reject temporary assets whose expiry has passed, independent of cleanup timing.
- [ ] 2.2 Update storefront cart/PDP customization recovery to turn an unavailable uploaded asset into an actionable replacement-upload state and prevent checkout until it is corrected.
- [ ] 2.3 Preserve existing behavior for retained order uploads and non-shopper customization assets.

## 3. Scheduled Cleanup

- [ ] 3.1 Add the backend Worker scheduled handler and daily cron configuration.
- [ ] 3.2 Implement bounded, idempotent cleanup of expired temporary shopper assets, including original and preview R2 objects plus D1 metadata.
- [ ] 3.3 Record cleanup processing, deletion, and retry/failure counts through the project’s existing observability approach.

## 4. Verification and Change Evidence

- [ ] 4.1 Add backend API and helper tests for 14-day temporary upload creation, successful-checkout retention, failed-checkout non-promotion, and expired-asset denial.
- [ ] 4.2 Add scheduled-cleanup tests for eligible asset deletion, retained/non-shopper exclusion, missing-object retry safety, and R2 deletion failure handling.
- [ ] 4.3 Add storefront tests for expired browser-cart upload recovery and checkout blocking until replacement upload succeeds.
- [ ] 4.4 Run `pnpm --filter backend test`, `pnpm --filter backend check`, `pnpm --filter backend build`, `pnpm --filter router-cf typecheck`, `pnpm --filter router-cf build`, and `./init.sh`.
- [ ] 4.5 Record verification evidence, operational rollout notes, and residual risks in this change's `progress.md` and `session-handoff.md`.
