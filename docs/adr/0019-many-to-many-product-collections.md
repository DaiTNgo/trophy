# Many-to-Many Product Collections

Products link to Product Collections (*Shop by Interest*) through a dedicated join table (`product_collection_links`) instead of a single nullable `collection_id` on the `products` table. This mirrors the existing many-to-many relationship with Product Categories (`product_category_links`).

A product such as a championship cup or acrylic award frequently serves multiple sports, occasions, or buyer intents simultaneously (e.g. Football, Basketball, and Corporate Recognition). Moving to a many-to-many relationship allows a single catalog item to be merchandised across multiple storefront collections without duplicating products or creating nested sub-categories.

## Considered Options

- Single `collection_id` column on `products`. Rejected because real-world awards naturally span multiple occasions and sports; restricting a product to one collection forces operators to duplicate products or leaves collections with incomplete assortments.
- Tag-based arbitrary string matching. Rejected because collections require structured localization, slugs, ranking, and visibility controls managed through admin metadata entities.
