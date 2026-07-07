# TrophySmack Customization Use Cases

Scope: first-party research on TrophySmack's two customization entry points:
- https://www.trophysmack.com/collections/custom-products
- https://www.trophysmack.com/collections/custom-trophy

Sources used here are limited to the collection pages themselves, first-party product pages linked from them, and first-party product data embedded in those pages.

## 1. Custom Products

### What buyers can customize

- This collection is TrophySmack's broad "custom awards" catalog: belts, rings, necklaces, turnover chains, trophies, acrylic awards, plaques, banners, engravings, display cases, and metal wall art are all called out on the page. The collection copy also says buyers can upload a logo, add names and dates, and build hardware "designed your way." [collection page](https://www.trophysmack.com/collections/custom-products)
- The strongest belt example is `Ultimate 6lb Custom Championship Belt`: the product copy says buyers can choose from clip art or upload their own images/logos, and the belt has space for up to 6 engraved nameplates on each side. [product page](https://www.trophysmack.com/products/custom-championship-belt)
- The necklace example is `The Ultimate Logo Custom Necklace`: the copy says buyers upload a design into a custom chain / pendant, and the product imagery reinforces that the pendant is meant to display a logo. [product page](https://www.trophysmack.com/products/the-ultimate-logo-custom-necklace)
- The logo tower trophy example is `22" Ultimate Custom Logo Tower Trophy`: the copy says buyers can upload any logo or design and add custom text. [product page](https://www.trophysmack.com/products/22-ultimate-custom-logo-tower-trophy)

### Shopper-visible option structure

- `Ultimate 6lb Custom Championship Belt` shows two purchasable option axes: `Finish` and `Strap Color`. The product data exposes 3 finishes and 16 strap colors, so shoppers see 48 visible combinations. [product page](https://www.trophysmack.com/products/custom-championship-belt)
- `The Ultimate Logo Custom Necklace` uses one option axis: `Chain Color` with `Gun Metal`, `Silver`, and `Gold`. [product page](https://www.trophysmack.com/products/the-ultimate-logo-custom-necklace)
- `22" Ultimate Custom Logo Tower Trophy` uses one option axis: `Color` with `Silver`, `Gold`, and `White`. [product page](https://www.trophysmack.com/products/22-ultimate-custom-logo-tower-trophy)
### Personalization workflow

- Belt personalization is multi-step: the page shows `Step : 1 Finish`, `Step : 2 Strap Color`, then `Step : 3 Select each plate to customize your own design`. The source also includes embedded option-config data for upload, crop-image, and buy-it-now controls, which indicates the personalization form supports image/file-based interactions in addition to plain variant selection. This is an inference from the embedded config. [product page](https://www.trophysmack.com/products/custom-championship-belt)
- The belt copy explicitly supports sporty clip art plus user-uploaded images/logos. [product page](https://www.trophysmack.com/products/custom-championship-belt)
- The necklace workflow is logo/image-first: the copy says buyers upload their design and there is a `See specifications below for "Upload Image" guidelines` note. [product page](https://www.trophysmack.com/products/the-ultimate-logo-custom-necklace)
- The tower trophy workflow is logo/text-first: shoppers upload a logo or design and add custom text before purchasing. [product page](https://www.trophysmack.com/products/22-ultimate-custom-logo-tower-trophy)
- The page source for TrophySmack's custom product pages includes first-party YMQ option settings with labels for upload, crop image, and file handling, which is consistent with a hosted designer / personalization app sitting on top of the Shopify product page. This is an inference from the embedded config. [product page](https://www.trophysmack.com/products/custom-championship-belt)

### Pricing, CTA, and cart behavior

- Collection cards in this collection use `View Details` CTAs and show price points such as `From $199` for the belt, `$75` for the ring, `$229` for the logo tower trophy, `$159` for the Skyward award, and `From $29` for the recognition plaque. [collection page](https://www.trophysmack.com/collections/custom-products)
- Product pages place the purchase CTA after the variant/customization flow and use a standard `Add to cart` button. [product page](https://www.trophysmack.com/products/custom-championship-belt) [product page](https://www.trophysmack.com/products/the-ultimate-logo-custom-necklace) [product page](https://www.trophysmack.com/products/22-ultimate-custom-logo-tower-trophy)
- The belt page says multiple belts can be made by adding the first completed belt to the cart, then returning to the product page to edit text for the next one. That means the cart is being used as a handoff point for repeat personalized orders, not just a final checkout bucket. [product page](https://www.trophysmack.com/products/custom-championship-belt)
- The collection page meta description advertises free shipping over $40 and free engraving on all orders. [collection page](https://www.trophysmack.com/collections/custom-products)
- The belt page's shipping section says custom championship belts, custom rings, and custom chains fall into a 5-7 business day production window, with rush fulfillment available. [product page](https://www.trophysmack.com/products/custom-championship-belt)

## 2. Custom Trophies

### What buyers can customize

- This collection is trophy-specific: the page says shoppers can start with a premium trophy style, upload a logo/artwork/design, and add names, championship years, and custom text. [collection page](https://www.trophysmack.com/collections/custom-trophy)
- The `26"-36" Ultimate Custom Trophy` page says the plaque and front plate are customizable, and the product copy points buyers to a designer tool for creating their own trophy when there is no off-the-shelf sport match. [product page](https://www.trophysmack.com/products/26-36-anything-trophy)
- The `Custom 20" Cup Square Base Trophy` page says the front plaque can be customized with a colorful graphic frame and personalized text. [product page](https://www.trophysmack.com/products/custom-20-cup-square-base-trophy)

### Shopper-visible option structure

- `26"-36" Ultimate Custom Trophy` has three visible option axes: `Total Size` (`26"` / `36"`), `Cup Color` (`Silver` / `Gold`), and `Column Color` (`Black`, `Silver`, `Blue`, `Red`, `Gold`, `Green`). That yields 24 visible combinations before any personalization. [product page](https://www.trophysmack.com/products/26-36-anything-trophy)
- `25" Anything Tower Trophy` is simpler: one `Cup Color` axis with `Gold` and `Silver`. [product page](https://www.trophysmack.com/products/25-anything-tower-trophy)
- `Custom 20" Cup Square Base Trophy` uses one `Color` axis with `Gold` and `Silver`. [product page](https://www.trophysmack.com/products/custom-20-cup-square-base-trophy)
- `Sacko Fantasy Football Loser Trophy` uses a `Style` toggle with `Non Custom` and `Custom` variants, so the shopper first chooses whether they want personalization at all. [product page](https://www.trophysmack.com/products/sacko-fantasy-football-loser-trophy)

### Personalization workflow

- The `26"-36" Ultimate Custom Trophy` page shows a 4-step flow: `Step : 1 Total Size`, `Step : 2 Cup Color`, `Step : 3 Column Color`, then `Step : 4 Customize product`. [product page](https://www.trophysmack.com/products/26-36-anything-trophy)
- The `Custom 20" Cup Square Base Trophy` page shows a 2-step flow: `Step : 1 Color`, then `Step : 2 Customize product`. The tooltip says the designer tool previews the product in real time. [product page](https://www.trophysmack.com/products/custom-20-cup-square-base-trophy)
- The `26"-36" Ultimate Custom Trophy` copy also says buyers can add nameplates to the sides and turn the base into a perpetual trophy, with up to 10 years of name plates. [product page](https://www.trophysmack.com/products/26-36-anything-trophy)
- The collection page FAQ says custom trophies can upload logos/artwork, add custom text, names, and dates. [collection page](https://www.trophysmack.com/collections/custom-trophy)

### Pricing, CTA, and cart behavior

- Collection cards in this collection use `View Details` CTAs and show price points such as `From $209` / `From $249` for the larger trophy, `$169` for the 25-inch tower trophy, `$149` for the square-base sports trophies, and `From $29` for the Sacko trophy. [collection page](https://www.trophysmack.com/collections/custom-trophy)
- Product pages use the standard `Add to cart` CTA after the variant and customization steps. [product page](https://www.trophysmack.com/products/custom-20-cup-square-base-trophy) [product page](https://www.trophysmack.com/products/26-36-anything-trophy)
- The `Custom 20" Cup Square Base Trophy` page says production/fulfillment time is separate from shipping and the custom trophy sits in the same 5-7 business day custom bucket used elsewhere on the site. [product page](https://www.trophysmack.com/products/custom-20-cup-square-base-trophy)
- The collection FAQ says most custom trophies are produced within 5-7 business days, with more complex designs taking longer. [collection page](https://www.trophysmack.com/collections/custom-trophy)

## 3. Admin Implications For Trophy

### Ranked recommendation

1. Split physical variants from personalization payload. Keep `size/color/finish` as SKU-driving variant axes, and store `text/logo/image/nameplate` data in a product-specific customization schema. This best matches what TrophySmack is doing on the storefront and avoids turning every personalized field into a SKU explosion. [product page](https://www.trophysmack.com/products/custom-championship-belt) [product page](https://www.trophysmack.com/products/26-36-anything-trophy) [collection page](https://www.trophysmack.com/collections/custom-trophy)
2. Model editor steps per product family. Belts need a plate-aware designer, tower trophies need variant selection plus a `Customize product` step, and logo necklaces need image-upload-first behavior. Trophy's admin should expose those as product-specific editor descriptors, not as one generic form. [product page](https://www.trophysmack.com/products/custom-championship-belt) [product page](https://www.trophysmack.com/products/22-ultimate-custom-logo-tower-trophy) [product page](https://www.trophysmack.com/products/the-ultimate-logo-custom-necklace)
3. Do not model all of this as plain variants. It is the cheapest initial implementation, but it is the worst fit because it cannot represent uploads, crop tools, or repeated nameplate workflows without absurd variant growth. [product page](https://www.trophysmack.com/products/custom-championship-belt) [product page](https://www.trophysmack.com/products/26-36-anything-trophy)

### Trade-off matrix

| Model | Performance | Complexity | Maintenance | Risk |
|---|---:|---:|---:|---:|
| Variant axes + separate personalization payload | Good | Medium | Medium | Low |
| Everything as variants | Poor at scale | Low upfront | High | High |
| Generic JSON blob only | OK | Low upfront | High later | Medium-high |

### Architectural fit

- This is a strong fit for Trophy's current direction because the storefront evidence shows a clean split between purchasable SKU choices and design-time personalization. Trophy should mirror that split in admin instead of forcing operators to think in one giant product form. [product page](https://www.trophysmack.com/products/custom-championship-belt) [product page](https://www.trophysmack.com/products/custom-20-cup-square-base-trophy)
- The highest-risk area is preserving line-item personalization across cart/order boundaries. Trophy should treat the customization payload as first-class order data, not as opaque variant text. That is the only way to support nameplate repetition, logo uploads, and per-item edits without losing information. [product page](https://www.trophysmack.com/products/custom-championship-belt) [product page](https://www.trophysmack.com/products/26-36-anything-trophy)

## Limitations

- I inspected representative products from each collection, not every product in either collection. The observed patterns are strong, but they are still sampled. [collection page](https://www.trophysmack.com/collections/custom-products) [collection page](https://www.trophysmack.com/collections/custom-trophy)
- Some personalization controls are only visible through embedded first-party config and static page text, so the exact runtime editor UI may differ from what the HTML reveals. [product page](https://www.trophysmack.com/products/custom-championship-belt) [product page](https://www.trophysmack.com/products/custom-20-cup-square-base-trophy)
- I did not validate Shopify checkout or post-cart fulfillment behavior beyond the storefront pages and embedded product data.

## Sources

- https://www.trophysmack.com/collections/custom-products
- https://www.trophysmack.com/collections/custom-trophy
- https://www.trophysmack.com/products/custom-championship-belt
- https://www.trophysmack.com/products/the-ultimate-logo-custom-necklace
- https://www.trophysmack.com/products/22-ultimate-custom-logo-tower-trophy
- https://www.trophysmack.com/products/custom-20-cup-square-base-trophy
- https://www.trophysmack.com/products/26-36-anything-trophy
- https://www.trophysmack.com/products/25-anything-tower-trophy
- https://www.trophysmack.com/products/sacko-fantasy-football-loser-trophy
