## Why

Bank-transfer checkout currently shows a hardcoded bank account (Vietcombank / 9987996745) and a home-grown `PT-{orderId}` transfer reference, and operators reconcile incoming transfers by hand before flipping `paymentStatus`. JETPAY BankHub can issue the transfer syntax + VietQR for each order and push a signed webhook when the linked account receives money, so orders can be confirmed automatically and shoppers get a scannable QR instead of manual copy/paste.

Source integration document: "Tài liệu tích hợp BĐSD JETPAY BankHub cho website" (APIs 3.2.1–3.2.5).

## What Changes

- Add a backend JETPAY BankHub client: client-credentials token (cached), transaction initialization (3.2.2), bank-app list (3.2.4) and deeplink generation (3.2.5), MD5 webhook signature verify/sign.
- Initialize a BankHub transaction when a bank-transfer storefront order is created; persist the returned transfer description, VietQR URL and beneficiary bank snapshot on the order. BankHub failure does not block order creation; initialization is retried lazily when payment instructions are fetched and manually from admin.
- **BREAKING (storefront contract)**: `GET /api/storefront/orders/payment-instructions` stops returning `paymentReference` (`PT-{id}`) and instead returns `paymentDescription`, `vietQrUrl`, `bank` and `bankhubStatus`. The `PT-{id}` reference helper is removed.
- Add public webhook `POST /api/webhooks/jetpay-bankhub` that verifies the signature, records every bank transaction idempotently by `transId`, matches it to an order, accumulates paid amount and marks the order `paid` when fully covered, and returns the signed per-record response JSON required by JETPAY.
- Add a new `payment_transactions` table and BankHub/payment columns on `orders`.
- Add shopper payment-status endpoint for polling; storefront payment page renders BankHub QR + bank details (no hardcoded account) and switches to a "paid" state automatically.
- Admin order detail shows received payment transactions, paid/outstanding amounts, BankHub status and a "re-initialize BankHub" action.
- Phase 2: storefront bank-app picker + deeplink on mobile via shopper-safe proxy endpoints.
- Configuration split: only domains and secrets come from env (`JETPAY_AUTH_URL`, `JETPAY_BANKHUB_URL`, `JETPAY_CLIENT_ID`, `JETPAY_CLIENT_SECRET`, `JETPAY_WEBHOOK_KEY`, documented in `.env.example`). Business settings (enable toggle, org tax number, bank code, bank account number, website domain) are stored in the database and edited by a super-admin on a new admin page `Settings → Payments`.
- nginx exposes the webhook path.

## Capabilities

### New Capabilities
- `bankhub-transaction-init`: Creating a BankHub transaction for a bank-transfer order, persisting its result, retry rules, and shopper payment-instructions / payment-status contract.
- `bankhub-payment-webhook`: Signed JETPAY webhook intake, idempotent transaction recording, order matching, paid-amount accumulation and signed response.
- `bankhub-payment-admin`: Admin visibility of BankHub status and received payment transactions per order, and manual re-initialization.
- `bankhub-settings`: Env-provided JETPAY domains/secrets plus DB-stored, super-admin-editable BankHub business settings, and the combined "configured" check.
- `bankhub-deeplink`: Shopper-safe bank-app list and deeplink generation for an order (phase 2).

### Modified Capabilities
<!-- openspec/specs/ has no archived specs yet; storefront order behavior changes are captured in bankhub-transaction-init. -->

## Impact

- **Backend**: `apps/backend/src/lib/env.ts`, new `apps/backend/src/lib/bankhub.ts`, `apps/backend/src/db/schema.ts` (orders columns + `payment_transactions`), `apps/backend/src/routes/storefront/orders.ts`, new `apps/backend/src/routes/webhooks/`, `apps/backend/src/app.ts` (mount + exported types), `apps/backend/src/routes/admin/orders.ts`, tests alongside each.
- **Storefront**: `apps/storefront/app/routes/checkout.tsx` (`PaymentInstructionsState`), `apps/storefront/app/lib/api.ts` / Hono RPC client.
- **Admin**: `apps/admin/src/lib/orders-client.ts`, `apps/admin/src/pages/order-detail/*`, new `Settings → Payments` page and route in `App.tsx`; new backend admin settings route.
- **Infra**: `.env.example`, `docker-compose.yml` env passthrough, `docker/nginx/nginx.conf` webhook location. Webhook URL must be registered on the JETPAY BankHub portal and reachable publicly (tunnel for TEST).
- **External**: JETPAY TEST domains `https://testdcauthapi.jetpay.vn`, `https://testdcbankhubapp.jetpay.vn/bhc`; production domains TBD.
- **Database**: orders columns, `payment_transactions`, singleton `bankhub_settings`; schema changes pushed in dev mode; migration authoring out of scope unless requested.
