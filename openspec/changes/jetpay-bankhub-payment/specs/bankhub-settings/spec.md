## ADDED Requirements

### Requirement: JETPAY domains and secrets come only from env
The backend SHALL read `JETPAY_AUTH_URL`, `JETPAY_BANKHUB_URL`, `JETPAY_CLIENT_ID`, `JETPAY_CLIENT_SECRET` and `JETPAY_WEBHOOK_KEY` only from environment variables, SHALL NOT persist them in the database, and SHALL NOT return secret values from any API.

#### Scenario: Settings API hides secrets
- **WHEN** a super-admin loads BankHub settings while all env values are set
- **THEN** the response reports `clientIdSet`, `clientSecretSet` and `webhookKeySet` as `true` and contains no client secret or webhook key value

#### Scenario: Missing env reported
- **WHEN** `JETPAY_WEBHOOK_KEY` is not set
- **THEN** the settings response reports `webhookKeySet = false` and BankHub is reported as not configured

### Requirement: BankHub business settings are stored in the database
The backend SHALL store a single BankHub settings record containing `enabled`, `orgTaxNo`, `bankCode`, `bankAccountNumber` and optional `domainWebsite`, editable through `GET/PUT /api/admin/settings/bankhub`. `bankCode` SHALL be one of the bank codes listed in the JETPAY integration appendix, and tax number and account number SHALL be required when `enabled = true`.

#### Scenario: Super-admin saves settings
- **WHEN** a super-admin saves `enabled = true`, `orgTaxNo = "0101234567"`, `bankCode = "VCB"`, `bankAccountNumber = "9987996745"`
- **THEN** the response is 200 and the next bank-transfer order uses these values in the JETPAY request

#### Scenario: Invalid bank code
- **WHEN** settings are saved with `bankCode = "XYZ"`
- **THEN** the response is 400 (validation error) and the stored settings are unchanged

#### Scenario: Enabling with missing account number
- **WHEN** settings are saved with `enabled = true` and an empty `bankAccountNumber`
- **THEN** the response is 400 (validation error)

#### Scenario: Regular admin denied
- **WHEN** an admin without the `super-admin` role calls the settings endpoints
- **THEN** the response is 403

### Requirement: BankHub is configured only when env and settings are complete
The backend SHALL treat BankHub as configured for transaction initialization and deeplink only when all env values are present and the stored settings are enabled and complete. Webhook signature verification SHALL depend only on `JETPAY_WEBHOOK_KEY`.

#### Scenario: Disabled settings stop new initializations
- **WHEN** a super-admin disables BankHub and a shopper creates a bank-transfer order
- **THEN** the order has `bankhubStatus = "not_configured"` and no JETPAY request is made

#### Scenario: Webhook still accepted while disabled
- **WHEN** BankHub settings are disabled and a correctly signed webhook arrives
- **THEN** the transaction is recorded and the response is 200

### Requirement: Admin payments settings page
The admin app SHALL provide a `Settings → Payments` page at `/settings/payments`, visible to super-admins, showing env status (domains and set/unset secrets, read-only) and a form for the stored BankHub settings with a bank-code select.

#### Scenario: Super-admin edits settings
- **WHEN** a super-admin changes the bank account number and saves
- **THEN** the page shows a success toast and reloading shows the new value
