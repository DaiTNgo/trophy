## Context

- Storefront checkout supports only `bank_transfer`. After `POST /api/storefront/orders` the shopper is redirected to `/checkout?order=…&access=…`, which calls `GET /api/storefront/orders/payment-instructions` (guarded by `verifyCheckoutAccessToken`) and renders `PaymentInstructionsState` with a hardcoded Vietcombank account and `PT-{orderId}` reference.
- `orders.paymentStatus` exists (`pending|paid|failed|refunded|cancelled`) but is only changed manually from admin. There is no record of incoming bank transactions.
- A comparable external integration already exists: `lib/misa.ts` (token + fetch helpers, `isMisaConfigured`, `MISA_*` env in `AppBindings`), called right after order creation with failure persisted on the order (`misaSyncStatus`, `misaLastError`). BankHub follows the same shape.
- JETPAY BankHub contract (integration doc):
  - 3.2.1 `POST {auth}/connect/token` form-urlencoded `client_id`, `client_secret`, `grant_type=client_credentials` → `access_token`, `expires_in` (86400).
  - 3.2.2 `POST {jbf}/orgs/transactions` Bearer → `bank{bankCode,bankName,bankAccountNumber,bankAccountName,branchName?,bankLogoUrl?}`, `order{orderId,amount,description,vietQrUrl}`; errors `E1000–E1006` (400), 401/403, 500.
  - 3.2.3 webhook (we host): `header{msgId,signature=md5(key+msgId)}`, `data.records[]{orderConfirmType,orderId,amount,description,transId,bankTransId,transTime}`; we must answer HTTP 200 with `header{msgId,responseMsgId,signature=md5(key+msgId+responseMsgId)}`, `data.records[]{transId,error(0 ok,1 invalid order,other fail),message,orderAmount,customer(required when error=0)}`. Non-200 = not delivered.
  - 3.2.4 `GET {jbf}/deeplink/bank-apps/list`, 3.2.5 `POST {jbf}/deeplink/generate`.

## Goals / Non-Goals

**Goals:**
- Every new bank-transfer order gets a BankHub transfer description + VietQR from JETPAY, shown to the shopper.
- Incoming transfers confirmed by JETPAY mark orders paid automatically, idempotently, with full audit trail.
- Shopper page reflects payment without manual refresh.
- Operators see transactions and can recover failed initialization.

**Non-Goals:**
- Refunds, cancellations or reversals through BankHub.
- MeInvoice issuance logic beyond passing `exportInvoice` (see Open Questions).
- Storing or editing JETPAY domains/secrets from the admin UI (env only).
- Multi-account / multi-org routing.
- Migration file authoring (dev mode schema push).

## Decisions

1. **Config split: env for domains/secrets, DB for business settings; one org/account.**
   - Env (never stored in DB, never returned by any API): `JETPAY_AUTH_URL`, `JETPAY_BANKHUB_URL`, `JETPAY_CLIENT_ID`, `JETPAY_CLIENT_SECRET`, `JETPAY_WEBHOOK_KEY` (Mã Bảo Mật).
   - DB singleton table `bankhub_settings` (`id = 1`): `enabled boolean default false`, `orgTaxNo text`, `bankCode text` (picklist from the integration doc appendix: ACB, AGRIBANK, BIDV, BIDVDIRECT, VCB, VCBIBANKING, VTB, TCB, MSB, MSBV2, SHB, MB, VPB, LPB, TPB), `bankAccountNumber text`, `domainWebsite text null`, `updatedAt`, `updatedBy`.
   - `getBankhubConfig(db, bindings)` merges both and returns `null` unless all env values are present AND settings are `enabled` with tax no, bank code and account number filled. Settings are read per request (one small row) so admin edits take effect immediately; no cache.
   - Webhook signature verification depends only on env (`JETPAY_WEBHOOK_KEY`), so transfers confirmed by JETPAY are still recorded even if a super-admin temporarily disables BankHub for new orders.
   - Admin API `GET/PUT /api/admin/settings/bankhub` (super-admin only) returns settings plus read-only `env: { authUrl, bankhubUrl, clientIdSet, clientSecretSet, webhookKeySet }` (booleans for secrets, never values) so operators can see what is missing. Admin page `Settings → Payments` (`/settings/payments`).
   - *Alternative*: everything in env — rejected by product owner; bank account/tax data must be editable without redeploy. *Alternative*: secrets in DB — rejected; secrets stay in env.

2. **`lib/bankhub.ts` client mirrors `lib/misa.ts`.** Module-level token cache keyed by client id, refreshed at `expires_in - 60s`, invalidated and retried once on 401. Token request uses `application/x-www-form-urlencoded` (doc typo `xxx-form-urlencoded` ignored). Non-200 responses become `BankhubRequestError{status, code, message}`. Response `order.description` falls back to `order.purpose` because the doc example uses `purpose`.

3. **`orderId` sent to JETPAY = `orders.orderNumber`.** It is unique, shopper-visible and already used as MISA sale-order number; webhook matching uses it. *Alternative*: numeric id — leaks sequence, harder to read in bank statements.

4. **Initialize at order creation, never block it.** After the order row is committed (next to the MISA sync), call 3.2.2 for `bank_transfer` orders. Success → `bankhubStatus=initialized` + snapshot columns. Failure / not configured → `bankhubStatus=failed|not_configured`, `bankhubLastError`. `payment-instructions` retries initialization when status is not `initialized` (at most once per request). Admin can force re-init. *Alternative*: lazy-only init on first instructions fetch — slower first paint and same failure mode.

5. **Data model.**
   - `orders` add: `bankhubStatus text default 'pending'`, `bankhubLastError text`, `bankhubInitializedAt timestamptz`, `paymentDescription text`, `vietQrUrl text`, `bankhubBankJson text` (snapshot of returned `bank`), `paidAmount integer not null default 0`, `paidAt timestamptz`.
   - New `payment_transactions`: `id serial`, `provider text default 'jetpay_bankhub'`, `transId text unique`, `bankTransId text`, `orderId integer null`, `orderRef text` (raw orderId from JETPAY), `amount integer`, `description text`, `transTime timestamptz null`, `confirmType integer`, `matchStatus text` (`matched|unmatched|order_not_payable`), `webhookMsgId text`, `responseJson text` (record-level response we returned), `rawRecordJson text`, `createdAt`. Indexes: unique `transId`, `orderId`.

6. **Webhook processing.**
   - Mounted at `/api/webhooks/jetpay-bankhub` (new `webhooksRoute`, outside `/storefront` and `/admin`, no session middleware, no CORS needs).
   - Signature check first: `md5(JETPAY_WEBHOOK_KEY + msgId)` hex, compared case-insensitively with `timingSafeEqual`. Invalid/missing → 401 (JETPAY treats as undelivered). Not configured → 503.
   - Body validated with valibot; malformed → 400.
   - Each record processed in its own DB transaction: insert into `payment_transactions` with `ON CONFLICT (trans_id) DO NOTHING`; on conflict return the stored `responseJson` (idempotent replay). Otherwise look up order by `orderNumber` with `SELECT … FOR UPDATE`, add `amount` to `paidAmount`, and if `paidAmount >= totalAmount` and status still `pending` set `paymentStatus='paid'`, `paidAt=now()`.
   - Record response: matched → `error:0`, `message:"Success"`, `orderAmount=totalAmount`, `customer` built from order (`name`, `phoneNumber`, `email`, VAT `taxNo`/`address` when present, `code` omitted). Unknown order → `error:1`. Order cancelled/refunded → `error:2` with message, transaction still stored (`order_not_payable`) for operator follow-up.
   - Response envelope: `responseMsgId = crypto.randomUUID()`, signature `md5(key + msgId + responseMsgId)`, HTTP 200.
   - Uses `node:crypto` (`createHash('md5')`), no new dependency.

7. **Shopper payment status.** New `GET /api/storefront/orders/payment-status?orderNumber&accessToken` → `{ paymentStatus, paidAmount, totalAmount, paidAt }`, same access-token guard. Storefront polls every 5s while the tab is visible, stops on `paid` or after 15 minutes (shows "check again" button). *Alternative*: SSE/WebSocket — overkill for low volume and harder behind nginx.

8. **Payment instructions contract.** Returns `order{orderNumber,totalAmount,currencyCode,paymentMethod,paymentStatus,createdAt,paymentDescription,vietQrUrl,bankhubStatus}` and `bank{bankCode,bankName,bankAccountNumber,bankAccountName,branchName,bankLogoUrl}|null`. `paymentReferenceForOrderId` is deleted (dev mode, no compat).

9. **Hono RPC.** New storefront and admin consumers use `hc<AppType>()` per repo rules; routes return `c.json(payload, status)` for every branch.

10. **Deeplink (phase 2).** `GET /api/storefront/payments/bank-apps` proxies 3.2.4 with 1h in-memory cache. `POST /api/storefront/payments/deeplink` takes `{orderNumber, accessToken, bankAppCode, redirectUrl?}` and fills `benAccNo`, `benAccName`, `benBankCode`, `taxCode`, `amount` (outstanding), `description` from the DB — the client never supplies money fields.

## Risks / Trade-offs

- [Webhook secret is MD5 over `key+msgId` only; body is not signed] → Replayed `msgId` with altered records would pass. Mitigation: idempotency by `transId`, amount accumulation only, nginx allowlist for JETPAY source IPs once known, log raw payloads.
- [Webhook arrives before order row commit (race)] → Order init happens after commit, and JETPAY only knows the description after 3.2.2, so race is not possible in practice; unmatched records are still stored.
- [JETPAY down at checkout] → Order still created; shopper sees "payment info unavailable, retry"; admin re-init action.
- [Partial / over payments] → Accumulate `paidAmount`; only `>= total` flips to paid. Over-payment is visible in admin; no automatic refund.
- [Token cache per process] → Fine for single backend container; each replica fetches its own token.
- [Doc inconsistencies (`description` vs `purpose`, content-type typo, `transTime` missing in example)] → Tolerant parsing; `transTime` optional.

## Migration Plan

1. Deploy schema push (dev mode) adding columns/table.
2. Set `JETPAY_*` env (domains + secrets) for TEST, fill and enable `Settings → Payments` as super-admin, register webhook URL on the BankHub portal, verify with a real TEST transfer.
3. Ship storefront/admin changes together with backend since payment-instructions contract changes.
4. Rollback: disable BankHub in `Settings → Payments` (or unset `JETPAY_*`) → orders get `bankhubStatus=not_configured`; storefront shows the "payment info unavailable" state (no hardcoded fallback).

## Open Questions

1. Partial/over payment policy — current decision: accumulate, mark paid at `>= total`, no auto action otherwise. Confirm.
2. Should `paid` also move `status` from `pending` to `confirmed`? Current decision: only `paymentStatus` changes.
3. `exportInvoice` — current decision: `false` always (MISA CRM sync already handles sale orders); confirm whether MeInvoice via BankHub is wanted when `vatRequested`.
4. Production domains and JETPAY webhook source IPs.
5. `domainWebsite` value per environment (now a DB setting).
6. Settings edit permission — current decision: super-admin only; regular admins cannot view or edit `Settings → Payments`.
