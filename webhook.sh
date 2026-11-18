#!/usr/bin/env bash
set -euo pipefail

read -rsp 'Mã Bảo Mật: ' KEY; echo
MSG="SELFTEST-$(date +%s)"
if command -v md5 >/dev/null; then
  SIG=$(printf '%s' "$KEY$MSG" | md5)                      # macOS
else
  SIG=$(printf '%s' "$KEY$MSG" | md5sum | cut -d' ' -f1)   # Linux
fi

curl -s -X POST https://api.ptplatinum.vn/api/webhooks/jetpay-bankhub \
  -H 'Content-Type: application/json' \
  -d "{\"header\":{\"msgId\":\"$MSG\",\"signature\":\"$SIG\"},\"data\":{\"records\":[{\"orderConfirmType\":1,\"orderId\":\"SELFTEST\",\"amount\":0,\"transId\":\"$MSG\"}]}}"
echo
