## ADDED Requirements

### Requirement: Shopper can list bank apps supporting deeplink
`GET /api/storefront/payments/bank-apps` SHALL return the JETPAY bank-app list (bankAppCode, appName, bankShortName, logoSmall, isDeepLinkSupport), cached server-side for up to one hour.

#### Scenario: Cached list
- **WHEN** the endpoint is called twice within one hour
- **THEN** JETPAY `GET /deeplink/bank-apps/list` is requested once

### Requirement: Shopper can generate a deeplink for an order
`POST /api/storefront/payments/deeplink` SHALL accept `orderNumber`, `accessToken`, `bankAppCode` and `redirectUrl`, reject a `redirectUrl` whose origin is not an allowed app origin, verify the checkout access token, and call JETPAY `POST /deeplink/generate` with beneficiary account, name, bank code, tax code, outstanding amount and transfer description taken from the stored order — never from the request body — returning `deepLinkUrl` (nullable) and `qrCodeData`.

#### Scenario: Deeplink generated
- **WHEN** a shopper with a valid access token requests a deeplink for `bankAppCode = "ACB"` on an initialized unpaid order
- **THEN** the response contains the JETPAY `deepLinkUrl` and the JETPAY request used the order's stored description and outstanding amount

#### Scenario: Order already paid
- **WHEN** the order has `paymentStatus = "paid"`
- **THEN** the response is 409 and no JETPAY request is made

#### Scenario: Foreign redirect URL
- **WHEN** `redirectUrl` points to an origin outside the configured storefront/admin origins
- **THEN** the response is 400 and no JETPAY request is made

#### Scenario: Bank without real deeplink
- **WHEN** JETPAY returns `deepLinkUrl = null`
- **THEN** the storefront falls back to showing the QR instead of redirecting
