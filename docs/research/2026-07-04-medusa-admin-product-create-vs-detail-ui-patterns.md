# Medusa Admin Product Create vs Detail/Edit UI Patterns

Scope: Medusa Admin product create/detail/edit patterns for customization-like data, using only Medusa first-party docs and Medusa source.

## Key Findings

1. **Product creation is a modal wizard, not an inline page.** Medusa Admin documents say create forms use `FocusModal`, and the product create route renders inside `RouteFocusModal` in the admin source. The product create flow is split into `Details`, `Organize`, and `Variants`, with an optional `Inventory Kits` step. The `RouteFocusModal` is used before the form is shown, after prerequisite data loads. Sources: [Forms - Admin Components](https://docs.medusajs.com/resources/admin-components/components/forms), [Focus Modal - Medusa UI](https://docs.medusajs.com/ui/components/focus-modal), [medusajs/medusa `product-create.tsx`](https://github.com/medusajs/medusa/blob/develop/packages/admin/dashboard/src/routes/products/product-create/product-create.tsx).

2. **Product detail is a two-column page with section-based editing.** The product detail route uses `LayoutComposer` with a two-column layout. In the source, the main column contains `ProductGeneralSection`, `ProductMediaSection`, `ProductOptionSection`, and `ProductVariantSection`; the side column contains `ProductSalesChannelSection`, `ProductShippingProfileSection`, `ProductOrganizationSection`, and `ProductAttributeSection`. The page also enables widget injection through the `product.details` zone prefix. Sources: [medusajs/medusa `product-detail.tsx`](https://github.com/medusajs/medusa/blob/develop/packages/admin/dashboard/src/routes/products/product-detail/product-detail.tsx), [Product Module's Admin Widget Injection Zones](https://docs.medusajs.com/resources/commerce-modules/product/admin-widget-zones).

3. **Edit actions usually open a drawer or bulk editor from a section header menu.** Medusa Admin docs describe edit/update forms as `Drawer`-based, not `FocusModal`-based. On the product detail page, general details, options, metadata, sales channels, shipping configuration, organization, and attributes are all edited from section-header actions that open a side window or bulk editor. Sources: [Forms - Admin Components](https://docs.medusajs.com/resources/admin-components/components/forms), [Drawer - Medusa UI](https://docs.medusajs.com/ui/components/drawer), [Edit Product in Medusa Admin](https://docs.medusajs.com/user-guide/products/edit).

4. **Custom product-like data on the detail page is handled primarily through metadata and widget zones.** Medusa’s product docs explicitly define product metadata as key-value custom data and expose a dedicated Metadata section on the detail page with row insertion/deletion controls. For UI extension, Medusa exposes `product.details.before`, `product.details.after`, `product.details.side.before`, and `product.details.side.after` widget zones, each receiving the product in `data`. Sources: [Edit Product in Medusa Admin](https://docs.medusajs.com/user-guide/products/edit), [Product Module's Admin Widget Injection Zones](https://docs.medusajs.com/resources/commerce-modules/product/admin-widget-zones), [Admin Widgets](https://docs.medusajs.com/learn/fundamentals/admin/widgets).

5. **Options are first-class on both create and detail flows, and can be global or product-specific.** In create, enabling variants reveals product option fields; Medusa automatically creates variants from selected options, and a newly entered option is product-specific. On the detail page, the Options section can reuse global options or create/edit product-specific ones, including option values. Sources: [Create Product in Medusa Admin](https://docs.medusajs.com/user-guide/products/create), [Edit Product in Medusa Admin](https://docs.medusajs.com/user-guide/products/edit), [Manage Product Options in Medusa Admin](https://docs.medusajs.com/user-guide/products/options).

6. **Create-form data becomes editable after creation by the product detail sections that mirror the create steps.** The create wizard captures general details, organization data, and variants. After creation, the detail page surfaces those same data groups as editable sections: general details, media, options, variants, sales channels, shipping configuration, organization, attributes, and metadata. This is a synthesis from the create and detail docs plus the detail-page source structure. Sources: [Create Product in Medusa Admin](https://docs.medusajs.com/user-guide/products/create), [Edit Product in Medusa Admin](https://docs.medusajs.com/user-guide/products/edit), [medusajs/medusa `product-detail.tsx`](https://github.com/medusajs/medusa/blob/develop/packages/admin/dashboard/src/routes/products/product-detail/product-detail.tsx).

7. **Medusa’s own “personalized products” recipe treats product customization flags as metadata, not a separate create-only field.** The recipe sets an `is_personalized` flag in product metadata from the product detail page to distinguish personalized products from regular ones. That is the cleanest first-party pattern for product-customization-like flags when you do not want a new core product field. Source: [Implement Personalized Products in Medusa](https://docs.medusajs.com/resources/recipes/personalized-products/example).

## Practical Readout

- If the data should exist at creation time and remain editable later, model it as part of the create wizard plus a matching section on product details.
- If the data is auxiliary or customization-specific, Medusa’s documented pattern is metadata on the product detail page, optionally surfaced through widget zones for custom UI.
- If the data is variant-choice related, use options/variants: create-time option entry, then edit/manage them from the product detail page.

## Tradeoff Summary

| Pattern | Best for | Trade-off |
|---|---|---|
| Create wizard + detail section parity | Core product fields that must be visible immediately after creation | More UI work, but the mental model stays consistent |
| Metadata on detail page | Custom flags, integrations, personalization markers | Flexible but unstructured; better for small key-value data than rich domain state |
| Widget injection on detail page | Custom UI that should live inside the product page | Keeps Medusa layout but cannot replace core sections wholesale |
| Options/variants | Customer-selectable attributes like size/color | Best fit for variant modeling, but not for arbitrary custom configuration |

## Bottom Line

Medusa’s default product UX is: **create in a FocusModal wizard, then manage in a two-column detail page with section-specific drawers/bulk editors**. For customization-like data, the native pattern is **metadata + widget injection** unless the data is truly part of product variation, in which case use **options/variants**. Sources: [Forms - Admin Components](https://docs.medusajs.com/resources/admin-components/components/forms), [Edit Product in Medusa Admin](https://docs.medusajs.com/user-guide/products/edit), [Product Module's Admin Widget Injection Zones](https://docs.medusajs.com/resources/commerce-modules/product/admin-widget-zones).
