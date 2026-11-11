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
