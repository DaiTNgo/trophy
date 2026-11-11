## ADDED Requirements

### Requirement: Admin order detail exposes BankHub payment data
The admin order detail API SHALL include `bankhubStatus`, `bankhubLastError`, `paymentDescription`, `paidAmount`, `paidAt` and the list of `payment_transactions` linked to the order (transId, bankTransId, amount, description, transTime, confirmType, createdAt), and the admin order detail page SHALL render them with paid and outstanding amounts.

#### Scenario: Order with two transfers
- **WHEN** an admin opens an order that received two matched transactions
- **THEN** the page lists both transactions and shows the summed paid amount and remaining outstanding amount

### Requirement: Admin can re-initialize BankHub transaction
An authenticated admin SHALL be able to trigger BankHub initialization for a pending bank-transfer order; the endpoint SHALL return the updated BankHub status and SHALL reject unauthenticated requests and orders that are already paid or cancelled.

#### Scenario: Recover failed initialization
- **WHEN** an admin triggers re-initialization on an order with `bankhubStatus = "failed"` and JETPAY succeeds
- **THEN** the response is 200 and the order shows `bankhubStatus = "initialized"`

#### Scenario: Unauthenticated request
- **WHEN** the re-initialize endpoint is called without an admin session
- **THEN** the response is 401

#### Scenario: Paid order
- **WHEN** re-initialization is requested for an order with `paymentStatus = "paid"`
- **THEN** the response is 409 and no JETPAY request is made
