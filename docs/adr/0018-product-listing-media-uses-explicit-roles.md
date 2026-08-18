# Product Listing Media Uses Explicit Roles

Product cards use two explicit Product asset references: the existing Product Thumbnail as their default image and a nullable Listing Hover Image. Admin assigns either role from one shared asset list rather than deriving it from variant gallery order; each asset may have only one role and each Product may have at most one asset per role. Deleting or replacing an asset clears only the role that references it, without fallback. This preserves Product Thumbnail for non-hover surfaces such as cart and orders while giving operators deterministic control of hover-capable storefront cards.

Listing Hover Image is optional and does not affect publish readiness. Product creation keeps its existing best-effort default-thumbnail initialization and never infers a hover image.

## Considered Options

- Infer the hover image from the second Variant Media item. Rejected because gallery order represents the selected variant's product-detail media, not an operator's catalog-card presentation decision.
- Store an arbitrary ordered list of Product card images. Rejected because the current requirement has two fixed presentation roles, and explicit references make the contract and asset lifecycle unambiguous.
