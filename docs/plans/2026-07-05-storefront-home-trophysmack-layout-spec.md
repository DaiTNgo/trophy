# Storefront Home UI Spec: Premium Championship Commerce

## Purpose

Redesign the storefront home page layout using TrophySmack's ecommerce structure as a reference, without copying its fantasy-football tone. The Trophy storefront should feel like a premium Vietnamese award manufacturer: clear enough to shop, proud enough to sell achievement, and specific enough to avoid a generic catalog homepage.

The page's single job is to help shoppers understand what Trophy sells, pick a product path quickly, and trust that the company can customize awards for real events, teams, and organizations.

## Source Inspiration

TrophySmack's home page works because it stacks ecommerce decisions in a strong order:

- Trust bar before navigation.
- Large search and category navigation before the hero.
- Full-bleed campaign hero with a concrete product-culture message.
- Social proof immediately below the hero.
- Category discovery before individual products.
- Best-selling product rails.
- A large customization story section.
- Gallery, reviews, SEO copy, newsletter, and footer.

The Trophy storefront should keep that commercial sequence, but change the brand expression from loud fantasy-sports teasing to premium recognition and made-to-order craftsmanship.

## Design Direction

### Name

Premium Championship Commerce

### Audience

Primary shoppers are business buyers, event organizers, sports league operators, school/event staff, and individuals looking for cúp, kỷ niệm chương, bảng vinh danh, huy chương, or custom recognition products.

### Tone

Premium, direct, confident, and practical. Avoid playful trash-talk language. Use Vietnamese copy as the default storefront voice.

### Visual Signature

The memorable signature is a full-bleed hero image where a physical award is treated like the main character: polished metal, crystal, engraved plate, and warm highlight. Typography sits over the product image with a bold Anton headline and a compact product-path panel.

This is the one intentional risk: the hero should be more cinematic and object-focused than a standard ecommerce grid, but the rest of the page should stay disciplined and shoppable.

## Design Tokens

Use the existing storefront design system in `apps/storefront/DESIGN.md` as the base.

### Color

- Championship Gold: `#875200` for primary CTAs and small emphasis.
- Gold Highlight: `#fea00c` for controlled hero accents and active states.
- Porcelain Surface: `#fcf9f8` for page background.
- Gallery White: `#ffffff` for product cards and header surfaces.
- Deep Charcoal: `#1c1b1b` for primary text.
- Warm Outline: `#d9c3ad` for dividers, soft frames, and secondary controls.

Do not introduce a dark-blue or purple gradient theme. Do not use decorative gradient orbs.

### Typography

- Display: Anton, uppercase, used for hero, section titles, and category labels only.
- Body: Hanken Grotesk, used for descriptions, product names, prices, forms, and navigation.
- Utility: Hanken Grotesk semibold uppercase for nav labels, category chips, and trust labels.

Large display text must use fixed responsive breakpoints, not viewport-width scaling.

## Page Structure

### Desktop Order

```txt
[TrustBar]
[Header: logo | product nav | occasion nav | search | cart]
[CategoryStrip]
[Hero: full-bleed image + headline + CTA + compact proof]
[ProofRow]
[ShopByProduct]
[BestSellers]
[CustomizationFeature]
[ShopByOccasion]
[RealWorkGallery]
[Reviews]
[SeoIntro]
[Newsletter]
[Footer]
```

### Mobile Order

```txt
[TrustBar compact carousel]
[MobileHeader: menu | centered logo | cart]
[Search full width]
[Horizontal category icons]
[Hero image + overlay headline + CTA]
[ProofRow as readable compact slides]
[ShopByProduct 2-column cards]
[BestSellers horizontal rail]
[CustomizationFeature stacked]
[ShopByOccasion]
[RealWorkGallery]
[Reviews]
[Footer accordions]
```

## Sections

### 1. Trust Bar

Goal: communicate low-friction buying and production confidence before browsing starts.

Desktop layout:
- Single row, full width.
- Four evenly spaced claims.
- Use small lucide-style icons where available.

Suggested claims:
- Miễn phí tư vấn thiết kế
- Khắc tên theo yêu cầu
- Giao hàng toàn quốc
- Cam kết hài lòng

Mobile layout:
- One visible claim at a time or a horizontally scrollable compact row.
- Keep text readable; do not squeeze four claims into one mobile row.

### 2. Header

Goal: make shopping paths obvious without burying search.

Desktop:
- Logo on the left.
- Primary nav: `Sản phẩm`, `Dịp sử dụng`, `Tùy chỉnh`, `Liên hệ`.
- Compact center/right search input with placeholder `Tìm cúp, kỷ niệm chương, huy chương...`.
- Search input sizing: 40px height, 360px to 480px desktop width, 14px text, 16px horizontal padding, 8px radius.
- Cart button on the far right.

Mobile:
- Top row: menu icon, centered logo, cart icon.
- Search input below the top row, full width but compact: 40px height, 14px text, 14px horizontal padding.
- Mobile menu groups links by product and occasion.

### 3. Category Strip

Goal: give repeat shoppers a fast route to product types.

Desktop categories:
- Cúp vinh danh
- Kỷ niệm chương
- Huy chương
- Bảng vinh danh
- Cúp thể thao
- Sản phẩm tùy chỉnh

Mobile:
- Horizontal icon/category strip below search.
- Each item has a product thumbnail or clean icon plus a two-line max label.

### 4. Hero

Goal: state the page thesis through product imagery and copy.

Desktop layout:

```txt
| full-bleed award/event image                         |
|                                                      |
|   VINH DANH                                         |
|   XỨNG TẦM                                          |
|   THÀNH TỰU                                         |
|                                                      |
|   Cúp, kỷ niệm chương và giải thưởng tùy chỉnh       |
|   cho doanh nghiệp, giải đấu và sự kiện.             |
|                                                      |
|   [Khám phá sản phẩm] [Tùy chỉnh theo yêu cầu]       |
|                                                      |
|   600k+ sản phẩm vinh danh | Khắc theo yêu cầu       |
```

Mobile:
- Image remains first and dominant.
- Text overlay must stay readable with a real contrast layer, not a heavy blur.
- CTA buttons stack or become full width.
- At least a hint of the next section should be visible on common mobile viewports.

Copy:
- H1: `Vinh danh xứng tầm thành tựu`
- Body: `Cúp, kỷ niệm chương và giải thưởng tùy chỉnh cho doanh nghiệp, giải đấu và sự kiện.`
- Primary CTA: `Khám phá sản phẩm`
- Secondary CTA: `Tùy chỉnh theo yêu cầu`

### 5. Proof Row

Goal: reassure immediately after the hero.

Use a restrained row of proof claims or customer/partner logos if assets exist. If real logos are not available, use production claims instead.

Preferred content:
- `Sản xuất theo yêu cầu`
- `Duyệt thiết kế trước khi làm`
- `Chất liệu pha lê, kim loại, gỗ`
- `Giao hàng toàn quốc`

Mobile must not crop text horizontally. Use slides or stacked compact proof cards.

### 6. Shop By Product

Goal: help users choose a product type before reading product details.

Desktop:
- 4 to 6 cards in a responsive grid.
- Each card uses a large product image, short uppercase title, one-sentence description, and link.
- Images should show actual products, not abstract decoration.

Initial cards:
- Cúp vinh danh
- Kỷ niệm chương
- Huy chương
- Bảng vinh danh
- Cúp thể thao
- Sản phẩm tùy chỉnh

Card copy should be concrete:
- `Cho lễ trao giải, nội bộ công ty và sự kiện thành tích.`
- `Khắc tên, logo và nội dung theo yêu cầu.`

### 7. Best Sellers

Goal: expose concrete products early enough for purchase intent.

Data:
- Use `best-sellers` collection from the storefront loader where available.
- Fallback to latest published products.
- Render up to 8 products; desktop can show 4 per row or carousel, mobile uses horizontal rail.

Product card requirements:
- Product image.
- Product name.
- Price or `Liên hệ báo giá` when `priceAmount` is null.
- Category or material chip if available.
- CTA: `Xem chi tiết`.

Empty state:
- If no products load, hide the section rather than showing placeholder products.

### 8. Customization Feature

Goal: explain the strongest differentiated capability: custom text, logo, image, and engraving.

Desktop layout:

```txt
| product/custom preview image | headline + copy + feature bullets |
```

Headline:
- `Thiết kế riêng cho từng khoảnh khắc`

Body:
- `Thêm logo, tên người nhận, hạng mục giải thưởng và thông điệp riêng. Mỗi sản phẩm có thể được duyệt thiết kế trước khi sản xuất.`

Bullets:
- Logo doanh nghiệp hoặc đội nhóm
- Tên người nhận và chức danh
- Nội dung khắc theo sự kiện
- Tư vấn bố cục trước khi sản xuất

CTA:
- `Bắt đầu tùy chỉnh`

Mobile:
- Image first, copy second, CTA full width.

### 9. Shop By Occasion

Goal: serve buyers who think by event, not by product type.

Occasion cards:
- Doanh nghiệp
- Giải đấu thể thao
- Trường học
- Sự kiện vinh danh
- Quà tri ân
- Thành tích cá nhân

Each card should link to a collection/search path if supported. If not yet supported, use product listing filters when available.

### 10. Real Work Gallery

Goal: build confidence through real examples.

Layout:
- Masonry-like or editorial grid with 6 to 10 images.
- Images must show finished products, event usage, engraving detail, packaging, or close-up materials.
- Avoid purely decorative background images.

If real gallery assets are unavailable, this section can be deferred. Do not fake client logos or testimonials.

### 11. Reviews

Goal: provide human proof without overloading the page.

Layout:
- One headline: `Khách hàng chọn Trophy cho những cột mốc quan trọng`
- 3 review cards max on desktop.
- Mobile uses stacked cards or carousel.

Content rules:
- Use real reviews if available.
- If no reviews exist, replace with production guarantees instead of invented testimonials.

### 12. SEO Intro

Goal: give search engines and deliberate buyers product context without making the page feel like a text dump.

Placement:
- Near the bottom, before newsletter/footer.

Content:
- 2 to 3 short paragraphs.
- Cover product categories, customization, and common use cases.

Avoid:
- Long repetitive keyword blocks.
- Copy that interrupts shopping sections above the fold.

### 13. Newsletter

Goal: collect leads from buyers not ready to purchase.

Copy:
- Heading: `Nhận mẫu thiết kế và ưu đãi mới`
- Body: `Đăng ký để nhận gợi ý sản phẩm, mẫu cúp mới và thông tin khuyến mãi.`
- Input placeholder: `email@example.com`
- Button: `Đăng ký`

Input sizing:
- Desktop newsletter input should use 40px height and a max width near 360px.
- Mobile newsletter input remains full width but keeps 40px height.
- Avoid oversized pill inputs; radius should stay near 8px to match the storefront component system.

## Data Requirements

The home loader should provide:

- Categories for category strip and shop-by-product.
- Best-seller products from collection handle `best-sellers`.
- Featured product or hero asset.
- Optional gallery assets.
- Optional review/proof data.

The first implementation may keep gallery/review content static if no backend model exists, but product cards and categories should use existing storefront API data where possible.

## Component Plan

Expected home components:

- `TrustBar`
- `StorefrontHeader` or existing layout header updates
- `CategoryStrip`
- `HeroSection`
- `ProofRow`
- `ShopByProductSection`
- `BestSellersSection`
- `CustomizationFeatureSection`
- `ShopByOccasionSection`
- `RealWorkGallerySection`
- `ReviewsSection`
- `SeoIntroSection`
- `NewsletterSection`

Do not put page sections inside decorative cards. Cards are only for repeated product/category/review items.

## Responsive Rules

- Desktop content max width should follow the existing `1280px` design system container.
- Hero can be full-bleed, but inner text content aligns to the container grid.
- Mobile margins use 16px.
- Header/search/category strip must remain usable before the hero.
- Text inside buttons and cards must not overflow in Vietnamese.
- Product/category cards should use stable image aspect ratios to prevent layout shift.
- Respect reduced motion for scroll reveal and hover animation.

## Accessibility

- Search input has a visible label or `aria-label`.
- Category and product cards are keyboard-focusable links.
- Buttons have visible focus states.
- Hero overlay contrast must pass readable contrast against the image.
- Carousel/rail controls, if used, must be reachable by keyboard and named clearly.
- Images have meaningful alt text based on product or scene.

## Acceptance Criteria

- Home page follows the section order defined in this spec on desktop and mobile.
- Above the fold contains trust signal, navigation/search, product category access, hero headline, and primary CTA.
- Mobile layout keeps search and category access before the hero.
- Hero uses real product/event imagery and Vietnamese copy, not abstract gradients or placeholder illustration.
- Best sellers render backend storefront products and hide cleanly if no products are available.
- Customization section clearly explains logo/text/engraving personalization.
- Category cards and product cards maintain stable dimensions across loading and hover states.
- No section uses fake testimonials, fake client logos, or invented production claims that are not defensible.
- `pnpm --filter router-cf typecheck`, `pnpm --filter router-cf build`, and `./init.sh` pass after implementation.

## Out Of Scope

- New backend schema for reviews or gallery assets.
- Checkout redesign.
- Product detail redesign.
- Admin CMS for homepage content.
- Migration work.

## Open Questions

- Which real hero image should be the canonical first viewport asset?
- Are there real customer logos, event photos, or reviews available?
- Should `Dịp sử dụng` be backed by collections, categories, tags, or plain product search parameters?
- Should the page prioritize Vietnamese-only copy or support bilingual labels later?
