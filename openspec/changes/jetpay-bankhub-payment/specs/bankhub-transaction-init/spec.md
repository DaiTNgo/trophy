## ADDED Requirements

### Requirement: BankHub transaction is initialized for bank-transfer orders
When a storefront order with payment method `bank_transfer` is created and BankHub is configured, the backend SHALL call JETPAY `POST /orgs/transactions` with the org tax number, bank code, bank account number and website domain from the stored BankHub settings, `order.orderId = orderNumber`, `order.amount = totalAmount`, and the order customer, and SHALL persist `paymentDescription`, `vietQrUrl`, the returned bank snapshot, `bankhubStatus = "initialized"` and `bankhubInitializedAt` on the order.

#### Scenario: Successful initialization
- **WHEN** a shopper creates a bank-transfer order for 250000 VND and JETPAY returns `order.description = "DH-TRP-0001"` and a VietQR URL
- **THEN** the order response is 201 and the stored order has `bankhubStatus = "initialized"`, `paymentDescription = "DH-TRP-0001"` and the VietQR URL

#### Scenario: Description returned under legacy purpose field
- **WHEN** JETPAY returns the transfer syntax in `order.purpose` instead of `order.description`
- **THEN** the backend stores that value as `paymentDescription`

### Requirement: BankHub failure does not block order creation
The backend SHALL create the order even when BankHub is not configured or the JETPAY call fails, and SHALL record `bankhubStatus = "not_configured"` or `"failed"` with `bankhubLastError`.

#### Scenario: JETPAY returns a business error
- **WHEN** JETPAY responds 400 with error code `E1002`
- **THEN** the order is still created and has `bankhubStatus = "failed"` and `bankhubLastError` containing `E1002`

#### Scenario: BankHub not configured
- **WHEN** a `JETPAY_*` env value is missing, or BankHub settings are disabled or incomplete
- **THEN** the order is created with `bankhubStatus = "not_configured"` and no JETPAY request is made

### Requirement: Token is cached and refreshed
The BankHub client SHALL obtain an access token with the client-credentials grant using a form-urlencoded body, reuse it until 60 seconds before `expires_in`, and on a 401 from a BankHub API SHALL discard the token and retry the request once.

#### Scenario: Token reused across requests
- **WHEN** two transactions are initialized within the token lifetime
- **THEN** only one token request is sent

#### Scenario: Expired token rejected
- **WHEN** a BankHub API returns 401 with a cached token
- **THEN** the client fetches a new token and retries the request exactly once

### Requirement: Payment instructions expose BankHub data
`GET /api/storefront/orders/payment-instructions` SHALL, for a valid checkout access token, return the order's `paymentDescription`, `vietQrUrl`, `bankhubStatus`, payment status and amounts plus the stored bank snapshot, and SHALL NOT return a locally generated payment reference. If `bankhubStatus` is not `initialized` and BankHub is configured, it SHALL attempt initialization once before responding.

#### Scenario: Instructions for initialized order
- **WHEN** the shopper loads payment instructions for an initialized order
- **THEN** the response contains `bank.bankAccountNumber`, `bank.bankAccountName`, `order.paymentDescription` and `order.vietQrUrl` from BankHub

#### Scenario: Lazy retry recovers failed initialization
- **WHEN** the order has `bankhubStatus = "failed"` and JETPAY now succeeds
- **THEN** the response contains BankHub data and the order is stored as `initialized`

#### Scenario: Invalid access token
- **WHEN** the access token does not match the order number
- **THEN** the response is 404 and no BankHub data is returned

### Requirement: Shopper can poll payment status
`GET /api/storefront/orders/payment-status` SHALL return `paymentStatus`, `paidAmount`, `totalAmount` and `paidAt` for a valid checkout access token and 404 otherwise.

#### Scenario: Order becomes paid
- **WHEN** a webhook has marked the order paid and the shopper polls
- **THEN** the response has `paymentStatus = "paid"` and a non-null `paidAt`

### Requirement: Storefront payment page renders BankHub instructions
The storefront payment page SHALL show the VietQR image, bank name/logo, account holder, account number and transfer description from the API (no hardcoded account), SHALL poll payment status while visible until paid or 15 minutes elapse, and SHALL switch to a paid confirmation state when `paymentStatus = "paid"`.

#### Scenario: Shopper completes transfer
- **WHEN** the shopper is on the payment page and the order becomes paid
- **THEN** within one polling interval the page shows the paid confirmation without a manual reload

#### Scenario: BankHub data unavailable
- **WHEN** `bankhubStatus` is not `initialized`
- **THEN** the page shows a "payment information unavailable" message with a retry action and no bank account details
