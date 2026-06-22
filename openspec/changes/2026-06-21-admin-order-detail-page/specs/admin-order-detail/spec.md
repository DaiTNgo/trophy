## ADDED Requirements

### Requirement: Order Detail Page
The system SHALL provide an admin order detail page that follows a Medusa-like operational layout for inspecting one order.

#### Scenario: Open order detail from list
- **WHEN** an admin selects an order from the orders page
- **THEN** the system opens a detail page for that order
- **AND** the page shows the order identifier and current operational status prominently

### Requirement: Order Detail Blocks
The system SHALL show the order through distinct operational blocks.

#### Scenario: Render order detail sections
- **WHEN** the order detail page loads successfully
- **THEN** the page shows summary, line items, customer, billing or shipping addresses, payment information, fulfillment information, and activity timeline sections

#### Scenario: Missing optional blocks
- **WHEN** optional data such as shipping details or fulfillment records do not yet exist
- **THEN** the page still renders successfully
- **AND** the system shows an empty or pending state for that block

### Requirement: Order Status Actions
The system SHALL support Medusa-like admin actions gated by the current order state.

#### Scenario: Block invalid capture action
- **WHEN** an admin attempts an action not allowed by the order payment state
- **THEN** the system prevents the action and explains why it is unavailable

#### Scenario: Allow valid order action
- **WHEN** an admin triggers an action allowed by the current order state
- **THEN** the system executes the action through the current mock service
- **AND** the page reflects the updated state after the action completes

### Requirement: Order Timeline Visibility
The system SHALL show an activity history for the order.

#### Scenario: View order timeline
- **WHEN** an order contains events such as creation, payment updates, status changes, or internal notes
- **THEN** the page renders them in chronological activity order

### Requirement: Order Detail API Contract
The system SHALL expose an order detail aggregate contract compatible with mock-first admin delivery and later backend implementation.

#### Scenario: Load order aggregate
- **WHEN** the admin requests an order detail record
- **THEN** the contract returns all page sections in one normalized aggregate
- **AND** the current phase can fulfill that contract from mock data

#### Scenario: Submit order action
- **WHEN** an admin triggers a supported order action
- **THEN** the contract accepts an action-specific payload
- **AND** the response returns the updated order state or action result
