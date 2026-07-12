# Admin Order Detail Design

## Overview
This document outlines the UI layout and frontend design for the Admin Order Detail page, adapting a reference Medusa-style 2-column layout to the Trophy customization domain.

## 1. Layout & Grid
- **Structure**: A 2-column layout utilizing `xl:grid-cols-[minmax(0,1fr)_360px]`.
- **Left Column (Main Content)**: Contains operational order data.
  - **Summary**: Order ID, status badges (payment, fulfillment), and Line Items.
  - **Payments**: Payment tracking, captured vs pending amounts.
  - **Fulfillment**: Shipping/fulfillment statuses.
- **Right Column (Sidebar)**: Contains metadata and reference info.
  - **Customer**: Name, contact details, shipping and billing addresses.
  - **Activity**: Timeline of order events.

## 2. Typography & Styling (Frontend Design)
- **Framework**: `@medusajs/ui`
- **Aesthetic**: Minimal, data-dense, workshop-style interface.
- **Colors**: 
  - Backgrounds: Clean white cards with `ui-border-base` borders.
  - Text: High contrast `ui-fg-base` for values, `ui-fg-subtle` for labels.
- **Typography**: Inter font with careful sizing (`text-small`, `text-xsmall`) to fit large amounts of data compactly without feeling cluttered.

## 3. Signature Element (The "Trophy" Domain Focus)
- **Production Ticket**: The Line Items section is the focal point. For products with customizations, the customization data (text, font, clipart) is presented in an inset "Production Ticket" card underneath the product.
- **Styling**: Uses `bg-ui-bg-subtle` and slight indentation to visually separate the core product (SKU, quantity) from the user's specific customization requests.

## 4. Action Hierarchy
- **Header Actions**: Top right dropdown for high-level order actions (e.g., Cancel, Edit).
- **Section Actions**: Specific buttons like "Capture Payment" in the Payments section, or "Edit Address" in the Customer section.
- **Note**: Actions may initially be disabled or read-only depending on backend support, but the layout accommodates them naturally.
