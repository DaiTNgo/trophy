# Session handoff — jetpay-bankhub-payment

State: code complete for tasks 1–8; remaining tasks 2.4, 6.5, 7.5, 9.1 (init.sh admin `vp` toolchain), 9.2, 9.3, 9.4 (this file).

Restart steps:
1. `docker compose up -d db` then `pnpm --filter backend db:push` (adds orders columns, `payment_transactions`, `bankhub_settings`; no migration file authored — dev mode).
2. Set `JETPAY_*` in `.env` (TEST domains in `.env.example`), `pnpm dev`.
3. Admin → Settings → Payments: fill tax no / bank code / account, enable.
4. Place a bank-transfer order on storefront → payment page shows BankHub QR; simulate webhook:
   `msgId=T1; sig=$(printf '%s' "$JETPAY_WEBHOOK_KEY$msgId" | md5)` then POST `{"header":{"msgId":"T1","signature":"<sig>"},"data":{"records":[{"orderConfirmType":1,"orderId":"<orderNumber>","amount":<total>,"description":"<desc>","transId":"T1","bankTransId":"B1"}]}}` to `http://localhost:8787/api/webhooks/jetpay-bankhub`.
5. Register `https://api.ptplatinum.vn/api/webhooks/jetpay-bankhub` (or tunnel URL for TEST) on the BankHub portal.

Open questions (design.md): partial/over-payment policy, paid → confirmed, exportInvoice/MeInvoice, production domains + JETPAY source IPs (nginx allowlist), domainWebsite per env, settings permission.

Toolchain: `./init.sh` admin step `vp build` fails with a Vite+ alias mismatch unrelated to this change; `pnpm exec vite build` in apps/admin succeeds.

## Debugging the flow (logs)

All BankHub logs are pino JSON lines with `module: "bankhub"` and an `event` field. Filter in Docker:
`docker compose logs -f backend | grep '"module":"bankhub"'` (or `| jq 'select(.module=="bankhub")'`).
`LOG_LEVEL=debug` adds request/response bodies of JETPAY calls and the raw webhook body. Secrets, tokens,
the token response and the webhook key are never logged.

| Stage | Events |
|---|---|
| Outbound JETPAY HTTP | `bankhub.http` (resource, url, status, durationMs; bodies on failure/debug), `bankhub.token.issued`, `bankhub.token.rejected` |
| Transaction init | `bankhub.init.start` / `.success` / `.failed` / `.not_configured` / `.order_missing` / `.unexpected_error` (trigger: checkout, payment_instructions, admin) |
| Webhook intake | `bankhub.webhook.received` (sourceIp, msgId, recordCount), `.invalid_json`, `.invalid_signature` (reason), `.invalid_payload` (issues), `.not_configured`, `.raw` (debug) |
| Per record | `bankhub.webhook.record` (matchStatus, error, paidBefore/After, paymentStatusBefore/After), `.record.duplicate`, `.record.race`, `bankhub.order.paid` |
| Response | `bankhub.webhook.processed` (responseMsgId, durationMs, per-record error) |
| Deeplink | `bankhub.deeplink.generated`, `bankhub.deeplink.failed`, `bankhub.bank_apps.failed` |
| Admin | `bankhub.admin.reinitialize`, `bankhub.settings.updated` |

Trace one order: grep its orderNumber (init + record + paid) and the webhook `msgId` (received → record → processed).
