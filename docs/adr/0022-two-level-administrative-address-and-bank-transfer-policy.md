# Two-Level Administrative Address and Storefront Bank Transfer Only Policy

Storefront checkout adopts Vietnam's two-level administrative division structure (Resolution 202/2025/QH15) and enforces a 100% upfront bank transfer payment policy. 

## Context & Architecture Decisions

1. **Two-Level Administrative Address (`province`, `ward`, `line1`)**:
   Vietnam's administrative restructuring removed the intermediate district level, organizing the nation into 34 provinces/centrally governed cities and 3,321 communes/wards. Rather than relying on freeform single-line address inputs or outdated three-level (province-district-ward) datasets, storefront checkout integrates `vietnam-divisions-js` (MIT license) for two-level structured selection:
   - Shoppers select **Tỉnh/Thành phố** from a dropdown of 34 provinces.
   - Shoppers select **Xã/Phường** from a dynamically filtered dropdown of communes belonging to the selected province.
   - Shoppers enter detailed street and house numbers (**Địa chỉ chi tiết**) in a text input.
   The resulting address snapshot stores `province`, `city` (representing ward/commune), and `line1` (detailed street address), and is formatted as `<line1>, <ward>, <province>` for MISA synchronization and order notifications.

2. **Bank Transfer Only Payment Policy**:
   Due to the customized nature of trophy products (custom engraving, etching, plaque mounting, and bespoke fabrication), cash on delivery (COD) poses significant operational and inventory risk. The checkout flow removes the cash-on-delivery option and mandates 100% upfront bank transfer (`paymentMethod: "bank_transfer"`). The checkout UI displays a clear informational card detailing transfer payment procedures rather than an unnecessary single-choice radio group.

3. **Purchase Notice Acknowledgment**:
   Shoppers must explicitly acknowledge custom fabrication timelines, proof approvals, and upfront payment rules via a mandatory checkbox ("Tôi đã đọc hiểu và đồng ý nội dung trong lưu ý mua hàng") before checkout can be submitted. Clicking the notice opens an in-page modal dialog so shoppers can review terms without abandoning their cart or checkout session.

## Considered Options

- **Free-form Text Address Input**: Rejected because unstandardized user-entered strings lead to delivery errors, postal code mismatches, and inaccurate carrier quoting.
- **Three-Level Administrative Hierarchy (Province/District/Ward)**: Rejected because it does not reflect the current post-restructuring administrative model of Vietnam.
- **External Public Address API at Runtime**: Rejected because third-party uptime dependencies during checkout directly harm conversion and reliability. Embedding the tree-shakable `vietnam-divisions-js` dataset provides zero-network, sub-millisecond lookups.
- **Preserving COD with Warning Disclaimers**: Rejected because custom fabricated orders cannot be restocked or reused if refused on delivery.
