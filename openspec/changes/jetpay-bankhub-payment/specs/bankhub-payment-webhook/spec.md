## ADDED Requirements

### Requirement: Webhook verifies JETPAY signature
`POST /api/webhooks/jetpay-bankhub` SHALL verify `header.signature` equals the hex MD5 of `JETPAY_WEBHOOK_KEY + header.msgId` (case-insensitive, constant-time comparison) before processing any record. It SHALL respond 401 on mismatch, 400 on a malformed body, and 503 when BankHub is not configured.

#### Scenario: Invalid signature
- **WHEN** a request arrives with a signature computed from a different key
- **THEN** the response is 401 and no `payment_transactions` row is written

#### Scenario: Valid signature
- **WHEN** the signature is `md5(key + msgId)` in uppercase hex
- **THEN** the records are processed and the response is 200

### Requirement: Transactions are recorded idempotently
Each webhook record SHALL be stored in `payment_transactions` keyed uniquely by `transId`, with the raw record, matched order (if any), match status and the record response returned. A record whose `transId` already exists SHALL NOT change order amounts again and SHALL receive the previously stored record response.

#### Scenario: Duplicate delivery
- **WHEN** JETPAY sends the same `transId` twice
- **THEN** `paidAmount` is increased only once and both responses carry the same record result

### Requirement: Matched transactions update order payment
For a record whose `orderId` matches an existing `orderNumber` in a payable state, the backend SHALL add `amount` to the order's `paidAmount`; when `paidAmount >= totalAmount` and `paymentStatus` is `pending`, it SHALL set `paymentStatus = "paid"` and `paidAt`.

#### Scenario: Full payment
- **WHEN** a record of 250000 arrives for an order totalling 250000
- **THEN** the order has `paidAmount = 250000` and `paymentStatus = "paid"`

#### Scenario: Partial then remaining payment
- **WHEN** records of 100000 and then 150000 arrive for an order totalling 250000
- **THEN** after the first record the order stays `pending` with `paidAmount = 100000`, and after the second it is `paid`

#### Scenario: Cancelled order receives money
- **WHEN** a record arrives for an order whose status is `cancelled`
- **THEN** the transaction is stored with `matchStatus = "order_not_payable"`, the order payment status is unchanged, and the record response has `error = 2`

### Requirement: Webhook returns signed per-record response
The webhook SHALL respond HTTP 200 with `header.msgId` echoed, a unique `header.responseMsgId`, and `header.signature = md5(key + msgId + responseMsgId)`, plus one `data.records[]` entry per input record containing `transId`, `error`, `message` and `orderAmount`; `customer` (name, phoneNumber, email, and taxNo/address from VAT details when present) SHALL be included when `error = 0`.

#### Scenario: Unknown order
- **WHEN** a record's `orderId` does not match any order
- **THEN** the record response has `error = 1`, the transaction is stored with `matchStatus = "unmatched"`, and the HTTP status is 200

#### Scenario: Successful record response
- **WHEN** a record matches an order
- **THEN** the record response has `error = 0`, `orderAmount` equal to the order total, and a `customer` object with the order customer name and phone

#### Scenario: Response signature
- **WHEN** the response is produced for `msgId = "20230710135000"`
- **THEN** `header.signature` equals `md5(key + "20230710135000" + header.responseMsgId)`
