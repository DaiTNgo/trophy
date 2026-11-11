## 1. Configuration & BankHub client

- [x] 1.1 Add env-only fields `JETPAY_AUTH_URL`, `JETPAY_BANKHUB_URL`, `JETPAY_CLIENT_ID`, `JETPAY_CLIENT_SECRET`, `JETPAY_WEBHOOK_KEY` to `AppBindings` / `getAppBindings` (`apps/backend/src/lib/env.ts`), `.env.example`, and `docker-compose.yml` backend env passthrough
- [x] 1.2 Create `apps/backend/src/lib/bankhub.ts` with `getBankhubConfig(db, bindings)` (env + DB settings merge, `null` unless complete and enabled), `BankhubRequestError`, cached client-credentials token (form-urlencoded, refresh at `expires_in - 60s`, single retry on 401)
- [x] 1.3 Implement `createBankhubTransaction(order)` (3.2.2) with `description` → `purpose` fallback and `E1000–E1006` error mapping
- [x] 1.4 Implement `verifyWebhookSignature` / `signWebhookResponse` (MD5 via `node:crypto`, case-insensitive timing-safe compare)
- [x] 1.5 Unit tests `bankhub.test.ts`: token caching + 401 retry, error mapping, purpose fallback, signature verify/sign with known-good hashes

## 2. Data model

- [x] 2.1 Add `bankhubStatus`, `bankhubLastError`, `bankhubInitializedAt`, `paymentDescription`, `vietQrUrl`, `bankhubBankJson`, `paidAmount`, `paidAt` to `orders` in `apps/backend/src/db/schema.ts`
- [x] 2.2 Add `payment_transactions` table with unique `trans_id` and `order_id` index
- [x] 2.3 Add singleton `bankhub_settings` table (`enabled`, `orgTaxNo`, `bankCode`, `bankAccountNumber`, `domainWebsite`, `updatedAt`, `updatedBy`)
- [ ] 2.4 Push schema to local PostgreSQL and run `pnpm --filter backend check`

## 3. BankHub settings (env + DB)

- [x] 3.1 Add `GET/PUT /api/admin/settings/bankhub` (super-admin only, bank-code picklist, required fields when enabled, env status booleans, never return secrets)
- [x] 3.2 Contract tests: super-admin read/save, 403 for admin, 401 unauthenticated, invalid bank code 400, enabled with missing fields 400, response contains no secret values
- [x] 3.3 Admin `Settings → Payments` page at `/settings/payments` (route in `App.tsx`, Hono RPC client, env status read-only, form with bank-code select, success toast)

## 4. Transaction initialization & shopper endpoints

- [x] 4.1 Add `initializeBankhubForOrder(db, bindings, order)` service that calls the client and persists success/failure/not_configured state
- [x] 4.2 Call it after order creation for `bank_transfer` orders in `POST /api/storefront/orders` without blocking order creation
- [x] 4.3 Rework `GET /payment-instructions` to return BankHub data + bank snapshot, lazy-retry once when not initialized; delete `paymentReferenceForOrderId`
- [x] 4.4 Add `GET /payment-status` guarded by checkout access token
- [x] 4.5 Contract tests in `routes/storefront/orders.test.ts`: init success, JETPAY failure still 201, not configured (missing env / settings disabled), instructions shape, lazy retry, invalid token 404, payment-status before/after paid

## 5. Webhook

- [x] 5.1 Create `apps/backend/src/routes/webhooks/jetpay-bankhub.ts` with valibot body schema; mount `/api/webhooks` in `app.ts`
- [x] 5.2 Implement signature gate (401 / 400 / 503)
- [x] 5.3 Implement per-record transaction: insert-on-conflict by `transId`, order lookup `FOR UPDATE`, `paidAmount` accumulation, paid transition, `matchStatus`, stored `responseJson`
- [x] 5.4 Build signed response envelope with `responseMsgId` and per-record `customer`
- [x] 5.5 Contract tests: webhook accepted while settings disabled, invalid signature, malformed body, full payment, partial then remaining, duplicate `transId`, unknown order `error=1`, cancelled order `error=2`, multi-record payload, response signature value
- [x] 5.6 Add nginx `location /api/webhooks/` (no auth rate-limit zone tightening beyond api_limit, body size limit) in `docker/nginx/nginx.conf`

## 6. Storefront

- [x] 6.1 Switch payment-instructions / payment-status calls to Hono RPC client and update response types
- [x] 6.2 Rewrite `PaymentInstructionsState` in `apps/storefront/app/routes/checkout.tsx`: VietQR image, bank logo/name, holder, account number + copy, description + copy; remove hardcoded account
- [x] 6.3 Add visible-tab polling (5s, stop on paid or 15 min, manual "check again") and paid confirmation state
- [x] 6.4 Add "payment information unavailable" state with retry when `bankhubStatus` is not `initialized`
- [ ] 6.5 `pnpm --filter router-cf typecheck` and `build`; verify flow in browser against local backend

## 7. Admin

- [x] 7.1 Extend admin order detail serializer with BankHub fields and linked `payment_transactions`
- [x] 7.2 Add `POST /api/admin/orders/:orderNumber/bankhub/initialize` (auth, 409 for paid/cancelled) with contract tests
- [x] 7.3 Update `apps/admin/src/lib/orders-client.ts` types/client (Hono RPC)
- [x] 7.4 Add "Payment transactions" section and BankHub status + re-initialize action to order detail page; wire paid/outstanding from `paidAmount`
- [ ] 7.5 `pnpm --filter admin build`

## 8. Deeplink (phase 2)

- [x] 8.1 Add `listBankApps` (1h cache) and `generateDeeplink` to `lib/bankhub.ts`
- [x] 8.2 Add `GET /api/storefront/payments/bank-apps` and `POST /api/storefront/payments/deeplink` (server-filled money fields, 409 when paid) with contract tests
- [x] 8.3 Storefront mobile bank-app picker on payment page; redirect to `deepLinkUrl`, fall back to QR when null

## 9. Verification & handoff

- [ ] 9.1 Run `pnpm --filter backend test`, `check`, `build`, and `./init.sh`
- [ ] 9.2 End-to-end on JETPAY TEST: register webhook URL (tunnel), create order, transfer, confirm order becomes paid
- [ ] 9.3 Resolve Open Questions in `design.md` with the user and record decisions
- [x] 9.4 Create/update `progress.md` and `session-handoff.md` in this change folder
