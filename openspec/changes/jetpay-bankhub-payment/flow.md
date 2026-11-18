# Luồng thanh toán chuyển khoản qua JETPAY BankHub

Tài liệu mô tả luồng thanh toán chuyển khoản ngân hàng qua JETPAY BankHub, đúng theo code hiện tại trên nhánh `migrate/db_env`. Các sơ đồ viết bằng Mermaid; GitHub, VS Code và Obsidian đều hiển thị được.

> **Nguyên tắc chính:** trình duyệt của khách **không bao giờ** gọi trực tiếp JETPAY. Storefront chạy trong trình duyệt và gọi backend (`VITE_BACKEND_URL`: dev là `http://localhost:8787`, production là `https://api.ptplatinum.vn`). **Chỉ backend** giữ secret và gọi JETPAY. Theo chiều ngược lại, JETPAY gọi webhook về backend.

---

## 1. Các thành phần

```mermaid
flowchart LR
  subgraph Client["Trình duyệt"]
    SF["Storefront<br/>/checkout"]
    AD["Admin<br/>Orders, Settings → Payments"]
    BA["App ngân hàng<br/>(mobile)"]
  end

  subgraph Server["Hạ tầng Trophy"]
    NG["nginx<br/>api.ptplatinum.vn"]
    BE["Backend (Hono)<br/>/api/storefront/*<br/>/api/admin/*<br/>/api/webhooks/jetpay-bankhub"]
    DB[("PostgreSQL<br/>orders<br/>payment_transactions<br/>bankhub_settings")]
    ENV[["env: JETPAY_AUTH_URL, JETPAY_BANKHUB_URL,<br/>JETPAY_CLIENT_ID, JETPAY_CLIENT_SECRET,<br/>JETPAY_WEBHOOK_KEY"]]
  end

  subgraph JP["JETPAY"]
    AUTH["Auth API<br/>/connect/token"]
    HUB["BankHub API<br/>/orgs/transactions<br/>/deeplink/*"]
    PORTAL["BankHub portal<br/>(Mã Bảo Mật, URL webhook)"]
  end

  BANK["Ngân hàng<br/>(tài khoản nhận)"]

  SF -- "HTTPS JSON" --> NG
  AD -- "HTTPS + session" --> NG
  NG --> BE
  BE --- DB
  ENV -. đọc .-> BE
  BE -- "client credentials" --> AUTH
  BE -- "Bearer token" --> HUB
  BA -- "chuyển khoản" --> BANK
  BANK -- "biến động số dư" --> HUB
  HUB -- "POST webhook (ký MD5)" --> NG
  SF -. "mở deeplink" .-> BA
```

| Thành phần | Vai trò | File chính |
|---|---|---|
| Storefront | Form checkout, trang hướng dẫn thanh toán, polling, chọn app ngân hàng | `apps/storefront/app/routes/checkout.tsx`, `components/checkout/PaymentInstructions.tsx`, `BankAppPicker.tsx`, `hooks/use-payment-status.ts`, `lib/api.ts` |
| Backend: route | Tạo đơn, trả hướng dẫn và trạng thái thanh toán, deeplink, webhook, API admin | `routes/storefront/orders.ts`, `routes/storefront/payments.ts`, `routes/webhooks/jetpay-bankhub.ts`, `routes/admin/orders.ts`, `routes/admin/settings.ts` |
| Backend: service | Gọi JETPAY, khởi tạo giao dịch, xử lý record webhook | `lib/bankhub.ts`, `lib/bankhub-payments.ts`, `lib/bankhub-settings.ts` |
| Admin | Section "Bank transfer (BankHub)" trong order detail, trang Settings → Payments | `pages/order-detail/order-detail-bankhub-section.tsx`, `pages/payment-settings.tsx` |

---

## 2. Toàn cảnh một đơn hàng

```mermaid
sequenceDiagram
  autonumber
  actor K as Khách
  participant SF as Storefront (trình duyệt)
  participant BE as Backend
  participant DB as PostgreSQL
  participant JP as JETPAY BankHub
  participant NH as Ngân hàng

  K->>SF: Điền form checkout, bấm Đặt hàng
  SF->>BE: POST /api/storefront/orders
  BE->>DB: INSERT orders (pending)
  BE->>JP: POST /orgs/transactions
  JP-->>BE: description "DH123" + vietQrUrl + bank
  BE->>DB: UPDATE orders (bankhub_status = initialized)
  BE-->>SF: 201 { orderNumber, checkoutAccessToken }
  SF->>SF: navigate /checkout?order=…&access=…
  SF->>BE: GET /orders/payment-instructions
  BE-->>SF: QR + STK + nội dung CK
  K->>NH: Quét QR / chuyển khoản "DH123"
  loop mỗi 5 giây (tối đa 15 phút)
    SF->>BE: GET /orders/payment-status
    BE-->>SF: pending
  end
  NH->>JP: Biến động số dư
  JP->>BE: POST /api/webhooks/jetpay-bankhub (ký)
  BE->>DB: INSERT payment_transactions, cộng paid_amount, paid
  BE-->>JP: 200 + response có ký
  SF->>BE: GET /orders/payment-status
  BE-->>SF: paid
  SF-->>K: "Thanh toán thành công"
```

Các mục 3–8 đi vào chi tiết từng bước.

---

## 3. Tạo đơn hàng và khởi tạo giao dịch BankHub

Trình duyệt gọi backend bằng `fetch` trong `handleSubmit` (`createStorefrontOrder` trong `lib/api.ts`). Backend tạo đơn trước, **sau đó** mới gọi JETPAY. Nếu JETPAY lỗi, đơn vẫn được tạo.

```mermaid
sequenceDiagram
  autonumber
  participant SF as Storefront<br/>checkout.tsx
  participant R as Backend<br/>POST /api/storefront/orders
  participant S as bankhub-payments.ts<br/>initializeBankhubForOrder
  participant C as bankhub.ts (client)
  participant DB as PostgreSQL
  participant A as JETPAY Auth
  participant H as JETPAY BankHub

  SF->>R: { customer, shipping, payment: bank_transfer, items, vat }
  R->>R: validate, tính giá từ catalog
  R->>DB: INSERT orders + order_items
  Note over R: (nếu có MISA thì sync MISA)
  R->>S: initializeBankhubForOrderId(orderId)
  S->>DB: SELECT bankhub_settings (id = 1)
  S->>S: env + settings → config?

  alt Thiếu env hoặc settings chưa bật / chưa đủ
    S->>DB: bankhub_status = not_configured
  else Đã cấu hình
    C->>C: token trong cache còn hạn?
    opt Chưa có token
      C->>A: POST /connect/token (form-urlencoded)
      A-->>C: access_token, expires_in
    end
    C->>H: POST /orgs/transactions<br/>org.taxNo, bank, order{orderId=orderNumber, amount}, customer
    alt 200
      H-->>C: bank{…}, order{description, vietQrUrl}
      S->>DB: bankhub_status = initialized<br/>payment_description, viet_qr_url, bankhub_bank_json
    else 401
      C->>A: lấy token mới, gọi lại đúng 1 lần
    else 400 E1000–E1006 / 5xx / mất kết nối
      H-->>C: error{code, message}
      S->>DB: bankhub_status = failed, bankhub_last_error
    end
  end

  R-->>SF: 201 { orderNumber, checkoutAccessToken (HMAC, 7 ngày) }
  SF->>SF: xoá giỏ, navigate /checkout?order=…&access=…
```

**`checkoutAccessToken`** là token ký HMAC chứa `orderNumber` và thời hạn hết hạn. Mọi API thanh toán phía khách (instructions, status, deeplink) đều yêu cầu token này, nên người lạ không xem hay thao tác được trên đơn của người khác.

---

## 4. Trang hướng dẫn thanh toán (kèm thử lại khi lỗi)

```mermaid
sequenceDiagram
  autonumber
  participant SF as Storefront<br/>PaymentInstructions
  participant R as GET /orders/payment-instructions
  participant S as initializeBankhubForOrder
  participant DB as PostgreSQL

  SF->>R: ?orderNumber&accessToken
  R->>R: verifyCheckoutAccessToken
  alt Token sai / hết hạn
    R-->>SF: 404
  end
  R->>DB: SELECT order
  opt bank_transfer AND pending AND bankhub_status ≠ initialized
    R->>S: thử khởi tạo lại (trigger = payment_instructions)
    S->>DB: cập nhật bankhub_status
  end
  R-->>SF: order{bankhubStatus, paymentDescription, vietQrUrl, paidAmount, …}<br/>bank{bankName, bankAccountNumber, bankAccountName, logo} | null

  alt bankhubStatus = initialized
    SF->>SF: hiện QR, STK, số tiền còn thiếu, nội dung CK (+ nút copy)
  else failed / not_configured
    SF->>SF: "Chưa thể tải thông tin chuyển khoản" + nút Thử lại
    Note over SF: Thử lại = gọi lại API này,<br/>backend sẽ thử khởi tạo thêm lần nữa
  end
```

Khi BankHub chưa sẵn sàng, backend **không trả** thông tin ngân hàng, để khách không chuyển nhầm vào tài khoản sai.

---

## 5. Webhook: JETPAY báo đã nhận tiền

```mermaid
sequenceDiagram
  autonumber
  participant NH as Ngân hàng
  participant JP as JETPAY BankHub
  participant NG as nginx<br/>location /api/webhooks/
  participant W as jetpay-bankhub.ts<br/>(route)
  participant P as processBankhubWebhookRecord
  participant DB as PostgreSQL

  NH->>JP: Tiền vào tài khoản, nội dung "DH123"
  JP->>JP: Khớp "DH123" → orderId 123
  JP->>NG: POST /api/webhooks/jetpay-bankhub
  NG->>W: proxy (chỉ POST, body ≤ 1 MB)

  W->>W: có JETPAY_WEBHOOK_KEY?
  alt Không có
    W-->>JP: 503 → JETPAY sẽ gửi lại
  end
  W->>W: parse JSON
  alt JSON lỗi
    W-->>JP: 400
  end
  W->>W: md5(key + msgId) == signature?
  alt Sai chữ ký
    W-->>JP: 401 (không ghi gì vào DB)
  end
  W->>W: validate records
  alt Sai định dạng
    W-->>JP: 400
  end

  loop Từng record (mỗi record là 1 DB transaction)
    W->>P: record, msgId
    P->>DB: SELECT payment_transactions WHERE trans_id
    alt Đã có (JETPAY gửi lại)
      P-->>W: response đã lưu (không cộng tiền lần nữa)
    else Giao dịch mới
      P->>DB: SELECT orders WHERE order_number FOR UPDATE
      P->>P: phân loại (bảng bên dưới)
      P->>DB: INSERT payment_transactions ON CONFLICT DO NOTHING
      opt matched
        P->>DB: UPDATE orders paid_amount += amount<br/>(đủ tổng → payment_status = paid, paid_at)
      end
      P-->>W: { transId, error, message, orderAmount, customer? }
    end
  end

  W->>W: responseMsgId = UUID<br/>signature = md5(key + msgId + responseMsgId)
  W-->>JP: 200 { header, data.records }
```

| Tình huống | `match_status` | Thay đổi trên đơn | `error` trả JETPAY |
|---|---|---|---|
| Đơn tồn tại, còn nhận thanh toán | `matched` | `paid_amount += amount`; đủ tổng → `paid` | `0` + `customer` |
| Không có đơn với `orderId` này | `unmatched` | — | `1` |
| Đơn đã hủy / hoàn tiền | `order_not_payable` | không đổi | `2` |
| `transId` đã xử lý trước đó | (giữ nguyên) | không đổi | trả lại đúng response cũ |

**Quy ước HTTP status:**
- `200` nghĩa là "đã nhận", kể cả khi record bị từ chối vì lý do nghiệp vụ (`error` = 1 hoặc 2).
- Mã khác 200 (400/401/503/500) khiến JETPAY coi là chưa gửi được và **gửi lại**.

---

## 6. Storefront theo dõi trạng thái thanh toán (polling)

```mermaid
sequenceDiagram
  autonumber
  participant UI as PaymentInstructions
  participant Hk as usePaymentStatus
  participant R as GET /orders/payment-status

  UI->>Hk: enabled = (bankhubStatus = initialized)
  loop mỗi 5 giây, chỉ khi tab đang hiển thị
    Hk->>R: ?orderNumber&accessToken
    R-->>Hk: { paymentStatus, paidAmount, totalAmount, paidAt }
    alt paid
      Hk-->>UI: isPaid → "Thanh toán thành công", dừng polling
    else paidAmount > 0
      Hk-->>UI: "Đã nhận X — còn thiếu Y"
    end
  end
  Note over Hk: Sau 15 phút: dừng, hiện nút "Kiểm tra lại"<br/>(bấm vào sẽ bắt đầu lại 15 phút)
```

---

## 7. Deeplink mở app ngân hàng (mobile)

```mermaid
sequenceDiagram
  autonumber
  actor K as Khách (mobile)
  participant UI as BankAppPicker
  participant R as Backend<br/>/api/storefront/payments
  participant DB as PostgreSQL
  participant H as JETPAY BankHub
  participant App as App ngân hàng

  UI->>R: GET /bank-apps
  R->>H: GET /deeplink/bank-apps/list (cache 1 giờ)
  H-->>R: danh sách app
  R-->>UI: apps (lọc isDeepLinkSupport)
  K->>UI: Chọn "ACB One"
  UI->>R: POST /deeplink { orderNumber, accessToken, bankAppCode, redirectUrl = trang hiện tại }
  R->>R: redirectUrl thuộc origin cho phép? (400 nếu không)
  R->>R: verify accessToken (404 nếu sai)
  R->>DB: SELECT order
  R->>R: còn pending? initialized? (409 nếu không)
  R->>H: POST /deeplink/generate<br/>benAccNo, benAccName, benBankCode, taxCode,<br/>amount = total − paid, description lấy từ DB
  H-->>R: { deepLinkUrl | null, qrCodeData }
  R-->>UI: kết quả
  alt Có deepLinkUrl
    UI->>App: window.location = deepLinkUrl
    App-->>UI: sau khi chuyển khoản, quay về redirectUrl
  else null
    UI-->>K: "Ngân hàng chưa hỗ trợ, vui lòng quét QR"
  end
```

Số tiền và nội dung chuyển khoản **luôn lấy từ DB**, client không sửa được.

---

## 8. Admin

```mermaid
sequenceDiagram
  autonumber
  actor SA as Super-admin
  actor AD as Admin
  participant UI as Admin app
  participant R as Backend /api/admin
  participant DB as PostgreSQL
  participant S as initializeBankhubForOrder

  Note over SA,UI: Cấu hình một lần
  SA->>UI: Settings → Payments
  UI->>R: GET /settings/bankhub
  R-->>UI: settings + env (chỉ có/thiếu, không lộ giá trị)
  SA->>UI: Nhập MST, ngân hàng, STK, domain, rồi bật
  UI->>R: PUT /settings/bankhub (chỉ super-admin)
  R->>DB: UPSERT bankhub_settings (id = 1)

  Note over AD,UI: Theo dõi đơn
  AD->>UI: Mở order detail
  UI->>R: GET /orders/:orderNumber
  R->>DB: order + items + payment_transactions
  R-->>UI: payment{bankhubStatus, paidAmount, transactions[]}
  opt bankhub_status ≠ initialized và đơn còn pending
    AD->>UI: "Re-initialize BankHub"
    UI->>R: POST /orders/:orderNumber/bankhub/initialize
    R->>S: trigger = admin
    S->>DB: cập nhật trạng thái
    R-->>UI: order đã cập nhật
  end
```

---

## 9. Máy trạng thái

### 9.1 `orders.bankhub_status`

```mermaid
stateDiagram-v2
  [*] --> pending: tạo đơn
  pending --> initialized: JETPAY 200
  pending --> failed: JETPAY lỗi
  pending --> not_configured: thiếu env / settings
  failed --> initialized: thử lại (trang thanh toán / admin)
  not_configured --> initialized: thử lại sau khi cấu hình
  failed --> failed: thử lại vẫn lỗi
  initialized --> [*]
```

### 9.2 `orders.payment_status` (đơn chuyển khoản)

```mermaid
stateDiagram-v2
  [*] --> pending
  pending --> pending: webhook trả thiếu (paid_amount < total)
  pending --> paid: webhook đủ tiền (paid_amount ≥ total)
  pending --> paid: admin "Mark as paid"
  pending --> failed: admin
  paid --> refunded: admin
  note right of paid
    Đơn đã hủy / hoàn tiền:
    webhook vẫn ghi giao dịch
    (order_not_payable) nhưng
    không đổi trạng thái
  end note
```

---

## 10. Dữ liệu

```mermaid
erDiagram
  orders ||--o{ payment_transactions : "order_id"
  orders {
    serial id PK
    text order_number UK "gửi JETPAY làm orderId"
    text payment_method "bank_transfer | cash_on_delivery"
    text payment_status "pending | paid | failed | refunded"
    int total_amount
    text bankhub_status "pending | initialized | failed | not_configured"
    text bankhub_last_error
    timestamptz bankhub_initialized_at
    text payment_description "nội dung CK từ JETPAY"
    text viet_qr_url
    text bankhub_bank_json "snapshot tài khoản nhận"
    int paid_amount "tổng tiền đã khớp"
    timestamptz paid_at
  }
  payment_transactions {
    serial id PK
    text trans_id UK "chống xử lý trùng"
    text bank_trans_id
    int order_id FK "null nếu không khớp"
    text order_ref "orderId thô từ JETPAY"
    int amount
    text description
    timestamptz trans_time
    int confirm_type "1 tự động, 2 thủ công"
    text match_status "matched | unmatched | order_not_payable"
    text webhook_msg_id
    text response_json "response đã trả, dùng khi gửi lại"
    text raw_record_json
  }
  bankhub_settings {
    int id PK "luôn = 1"
    bool enabled
    text org_tax_no
    text bank_code
    text bank_account_number
    text domain_website
    text updated_by
  }
```

---

## 11. Bảng tra API

| Gọi từ | Method + path | Xác thực | Mục đích |
|---|---|---|---|
| Storefront | `POST /api/storefront/orders` | — | Tạo đơn + khởi tạo BankHub |
| Storefront | `GET /api/storefront/orders/payment-instructions` | checkoutAccessToken | QR, STK, nội dung CK (kèm thử lại khi lỗi) |
| Storefront | `GET /api/storefront/orders/payment-status` | checkoutAccessToken | Polling trạng thái |
| Storefront | `GET /api/storefront/payments/bank-apps` | — | Danh sách app hỗ trợ deeplink |
| Storefront | `POST /api/storefront/payments/deeplink` | checkoutAccessToken + redirect allowlist | Sinh deeplink |
| JETPAY | `POST /api/webhooks/jetpay-bankhub` | MD5(Mã Bảo Mật + msgId) | Báo đã nhận tiền |
| Admin | `GET /api/admin/orders/:orderNumber` | admin session | Order detail + giao dịch |
| Admin | `POST /api/admin/orders/:orderNumber/bankhub/initialize` | admin session | Khởi tạo lại BankHub |
| Admin | `GET/PUT /api/admin/settings/bankhub` | super-admin | Cấu hình BankHub |
| Backend → JETPAY | `POST {auth}/connect/token` | client_id/secret | Lấy token (cache tới 60 giây trước hạn) |
| Backend → JETPAY | `POST {hub}/orgs/transactions` | Bearer | Khởi tạo giao dịch (3.2.2) |
| Backend → JETPAY | `GET {hub}/deeplink/bank-apps/list` | Bearer | 3.2.4 |
| Backend → JETPAY | `POST {hub}/deeplink/generate` | Bearer | 3.2.5 |

---

## 12. Debug

Mọi log của luồng đều có `module: "bankhub"`; `LOG_LEVEL=debug` sẽ ghi thêm body request/response. Danh sách event đầy đủ nằm trong `session-handoff.md`.

```text
Tạo đơn       → bankhub.http(token) → bankhub.http(transaction) → bankhub.init.success | .failed | .not_configured
Trang TT      → (nếu chưa initialized) bankhub.init.start(trigger=payment_instructions) → …
Webhook       → bankhub.webhook.received → bankhub.webhook.record (paidBefore → paidAfter) → bankhub.order.paid → bankhub.webhook.processed
Bị từ chối    → bankhub.webhook.invalid_signature | .invalid_payload | .invalid_json | .not_configured
Deeplink      → bankhub.http(bank-apps | deeplink) → bankhub.deeplink.generated | .failed
```

Lần theo một đơn: grep theo `orderNumber`. Lần theo một lần JETPAY gọi webhook: grep theo `msgId`.
