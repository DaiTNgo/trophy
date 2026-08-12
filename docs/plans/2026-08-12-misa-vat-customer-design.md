# MISA VAT Customer Design

## Decision

Treat checkout VAT information with a non-empty tax ID as the buyer's MISA
Customer company identity. Use `TROPHY-TAX-<normalized tax ID>` as the stable
MISA `account_number`, and send the tax ID through MISA's documented
`tax_code` field. The Customer name, email, and invoice address come from the
VAT form. The existing phone-keyed personal Customer flow remains for
checkouts without a tax ID.

## Relationship

The Customer key selected above is passed unchanged into the existing Contact
and SaleOrder `account_name` fields. Contacts remain individually keyed by the
checkout contact's phone; this change does not alter recipient selection.

## Verification

Unit tests assert company and personal Customer payloads, deterministic MST
normalization, and SaleOrder reference reuse. Backend tests, typecheck, and
build are run after implementation.
