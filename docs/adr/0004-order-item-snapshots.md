# Order Item Snapshots

Storefront order creation captures immutable order item snapshots instead of relying on live product, variant, price, or customization references. The backend reads the current product and variant state at the moment the shopper requests order creation, rejects unpriced Contact Price items, and stores the product, variant, price, address, and customization context needed to reproduce what was purchased even if catalog or customization data changes later.

**Consequences**

Customized order items store both shopper-entered customization values and a backend-built rendered design snapshot, along with the template and selected variant background context used to produce it. Non-customized items still store product, variant, and price snapshots, while their production status is marked as not required.
