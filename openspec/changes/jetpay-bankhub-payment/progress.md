# Progress — jetpay-bankhub-payment

## 2026-11-11 — implementation session 1

### Done
- Config split: env-only `JETPAY_AUTH_URL`, `JETPAY_BANKHUB_URL`, `JETPAY_CLIENT_ID`, `JETPAY_CLIENT_SECRET`, `JETPAY_WEBHOOK_KEY` (`lib/env.ts`, `.env.example`, `docker-compose.yml`). Business settings in singleton `bankhub_settings`, edited at Admin → Settings → Payments (super-admin).
- `apps/backend/src/lib/bankhub.ts`: token cache (form-urlencoded, refresh 60s early, single 401 retry), 3.2.2 init with `description`→`purpose` fallback and E1xxx mapping, 3.2.4 bank apps (1h cache), 3.2.5 deeplink, MD5 webhook verify/sign (case-insensitive, timing-safe).
- `lib/bankhub-settings.ts` (load/save/merge config), `lib/bankhub-payments.ts` (init service, idempotent webhook record processing, payment accumulation, shopper/admin serialization).
- Schema: `orders` + `bankhub_*`, `payment_description`, `viet_qr_url`, `paid_amount`, `paid_at`; new `payment_transactions` (unique `trans_id`), `bankhub_settings`.
- Routes: `POST /api/webhooks/jetpay-bankhub`; storefront `GET /orders/payment-instructions` (BankHub data + lazy retry, `PT-{id}` removed), `GET /orders/payment-status`, `GET /payments/bank-apps`, `POST /payments/deeplink`; admin `GET/PUT /settings/bankhub`, `POST /orders/:orderNumber/bankhub/initialize`, order detail `payment` block.
- Storefront: `PaymentInstructions` (VietQR, bank data, copy, 5s visible-tab polling up to 15 min, paid state, unavailable+retry), mobile `BankAppPicker`.
- Admin: `OrderBankhubSection` (status, beneficiary, transactions, re-init), paid/outstanding from `payment.paidAmount`, Settings → Payments page + sidebar child links.
- nginx: `location /api/webhooks/` on `api.ptplatinum.vn` (POST only, 1m body).

### Verification evidence
- `pnpm --filter backend test` → 54 files / 412 tests passed (new: `lib/bankhub.test.ts` 13, `lib/bankhub-payments.test.ts` 12, `routes/admin/settings.test.ts` 8, `routes/admin/orders-bankhub.test.ts` 6, `routes/webhooks/jetpay-bankhub.test.ts` 9, `routes/storefront/payments.test.ts` 8, storefront orders +7).
- `pnpm --filter backend check` / `build` → pass.
- `pnpm --filter router-cf typecheck` / `build` → pass.
- Admin `tsc -b` → pass; `pnpm exec vite build` (same as `build:docker`) → pass; `pnpm --filter admin test` → 76 passed.
- `./init.sh` → fails at admin `vp build`: "Expected @voidzero-dev/vite-plus-core@1.4.0, but found vite@8.3.2" — environment/toolchain mismatch, admin package.json/lockfile untouched by this change.

### Not verified
- Schema not pushed (local Postgres and Docker daemon were down) → task 2.4.
- No browser run of storefront payment page / admin pages → tasks 6.5, 7.5 partially.
- nginx config not syntax-checked (no docker/nginx binary available).
- No JETPAY TEST end-to-end → 9.2.

### Decisions / deviations recorded
- Validation errors return 400 (repo `parseJson` convention), spec updated from 422.
- Storefront calls use the existing fetch wrappers in `app/lib/api.ts`, not Hono RPC: the storefront app has no `hono`/`backend` workspace dependency and every existing storefront call is a fetch wrapper. Admin consumers use `backendClient` (`hc<AppType>`).
- `benBankCode` for deeplink = stored beneficiary bank snapshot code (our account), not the shopper's bank app (doc wording is ambiguous; example uses same code).
- Deeplink `redirectUrl` must belong to an allowed app origin (`getAppCorsOrigins`).
- `exportInvoice` always `false`; paid only flips `paymentStatus` (open questions 2–3).

### Next step
Start Postgres (`docker compose up -d db`), `pnpm --filter backend db:push`, then verify storefront payment page + admin Settings → Payments in the browser; then JETPAY TEST E2E with a tunnel.
