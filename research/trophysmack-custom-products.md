# Nghiên cứu: TrophySmack Custom Products

**Nguồn:** https://www.trophysmack.com/collections/custom-products + các trang product chi tiết

## Tổng quan

TrophySmack là cửa hàng Shopify bán trophy giải thưởng thể thao custom. Họ có ~105 sản phẩm custom trong collection, chia theo:
- **Product category:** Trophies, Belts, Rings, Turnover Chains, Engravings, Banners, Plaques, v.v.
- **Interest:** Fantasy Football, Baseball, Corporate, Graduation, v.v.

## Cấu trúc custom hóa theo product

### 1. Championship Belt (phức tạp nhất)

Mỗi belt có **3 bước custom**:

| Step | Field | Type | Options |
|---|---|---|---|
| 1 | Finish | Select (radio) | Gold / Silver / Rose Gold |
| 2 | Strap Color | Select (radio) | 16 options: Black Leather, White Leather, Blue, Red, Snake Skin, Alligator Skin, Desert Camo, Digital Camo, Green Camo, Tan, Green Leather, Leopard Leather, Orange, Purple, Pink, Royal Blue |
| 3 | 3 Plate zones | Design tool (tabs) | Center plate (13"x9"), Left side plate (5.5"x4"), Right side plate (5.5"x4") |

**Trong design tool mỗi plate zone (Customily):**
- Text input (tên, năm, league, v.v.) — có text color, font selection
- Image upload (logo, artwork)
- Clip art library (icons, sports symbols)
- Real-time preview
- Warped/curved text option
- Unlimited fonts + unlimited color options

**Pricing logic:**
- Base: $199
- Strap upgrade: +$10 (leather colors), +$20 (camo/snake/alligator/leopard)
- Variants generated: Finish × Strap = 3 × 16 = 48 SKUs

### 2. Championship Ring (đơn giản hơn)

| Step | Field | Type | Options |
|---|---|---|---|
| 1 | Color | Select | Gold / Silver |
| 2 | Customize | Design tool | 1 face zone (1"x1") |

- Single size (12) — showpiece, không resizable
- Bulk discount: 5-10 = 10%, 11-49 = 15%, 50-75 = 20%, 76-99 = 25%, 100+ = 30%

### 3. Logo Custom Necklace

| Step | Field | Type | Options |
|---|---|---|---|
| 1 | Chain Color | Select | Gun Metal / Silver / Gold |
| 2 | Customize | Design tool | 1 pendant zone (tối đa 8"x8") |

- Image upload guidelines: high-res PNG/JPEG, no people, full view
- Pendant in acrylic, logo printed on black background

### 4. "Design Your Own" variants

Một số product có variant "Design Your Own" cho phép upload full-image thay vì dùng text + clip art — về cơ bản cùng cấu trúc step nhưng design tool mở toàn bộ surface cho image upload.

## Data model admin cần

Dựa trên phân tích, admin cần tổ chức:

### Product Blueprint
```
Product {
  id
  name
  basePrice
  categories: [Category]
  interests: [Interest]
  customizationZones: [CustomizationZone]
  variantDimensions: [VariantDimension]
  productionSpecs: ProductionSpecs
  addOns: [AddOn]
}

CustomizationZone {
  id
  name              // "Center Plate", "Left Side Plate", "Ring Face"
  type: "plate" | "face" | "pendant"
  dimensions: { width, height, unit }
  allowedContent: ["text", "image", "clip_art"]  // hoặc subset
  maxTextLength: number
  maxFileSize: number
  acceptedFileTypes: ["png", "jpg", "svg"]
  clipArtCategories: [string]  // filter clip art by category
  required: boolean
  textFormatting: {
    supported: ["plain", "line_breaks", "color", "font_family"]
    unsupported: ["bold", "italic", "underline", "strikethrough"]
  }
}

VariantDimension {
  id
  name              // "Finish", "Strap Color", "Chain Color"
  type: "select" | "radio"
  options: [{
    label: string
    priceDelta: number  // có thể 0, +10, +20
    imageUrl?: string   // preview hình variant
  }]
}

ProductionSpecs {
  material: string
  weight: string
  dimensions: string
  productionTime: string  // "5-7 business days"
  specialInstructions: string
}

AddOn {
  id
  name              // "Engraved Nameplate (set of 6)"
  price: number
  perProduct: boolean  // true = tính theo số lượng per product
}
```

### Logo & Image Handling

- **Không có thư viện logo riêng.** User tự upload logo/ảnh của họ (PNG/JPEG) qua design tool cho từng product zone hỗ trợ image
- Upload ảnh là **per-product, per-session** — không lưu thành profile logo để dùng lại
- Clip art library (icon thể thao, hình khung, text templates) là **dùng chung cho mọi sản phẩm** — admin upload 1 lần, user nào cũng thấy
- Một số product có variant "Design Your Own" cho phép upload full-image phủ toàn bộ surface thay vì chỉ 1 zone

### Clip Art Library
```
ClipArt {
  id
  name
  imageUrl
  category: "sports" | "trophies" | "animals" | "text_templates"
  tags: [string]
  premium: boolean
}
```

### Order Customization Data
Khi user add to cart, dữ liệu custom lưu kèm:
```
OrderItemCustomization {
  zoneId: string
  content: {
    text?: string
    imageUrl?: string
    clipArtId?: string
  }
}
```

## Admin UI cần có

1. **Product Builder** — tạo Product Blueprint: định nghĩa zones, variant dimensions, pricing matrix
2. **Clip Art Manager** — upload/ categorize clip art assets
3. **Order Dashboard** — xem từng order với full customization data, ảnh preview, production specs
4. **Pricing Rules Engine** — variant combination → final price (base + sum of deltas)
5. **Image Upload Guidelines** — per-product rules (max size, file type, content restrictions)
6. **Bulk Order Tools** — re-use design template với text thay đổi per item

## Design Tool: Customily

TrophySmack tích hợp **Customily** (https://www.customily.com) — một third-party product personalization platform cho Shopify.

### Cách tích hợp

- **Activation:** Product tag `"Customily"` trong Shopify → kích hoạt Customily JS
- **DOM injection:** Customily render design studio trực tiếp vào DOM (không phải iframe)
- **Selector:** `.customily-product` class trên container — Customily tự động tìm và inject UI vào đây
- **Scripts:** `customily.js` + `customily.shopify.script.unified.js` load từ CDN
- **Tắt:** Một số variant dùng tag `no-customily` hoặc `no_customize_label` để disable

### Tính năng text từ Customily

Customily hỗ trợ **đầy đủ** text customization:

| Tính năng | Hỗ trợ? | Ghi chú |
|---|---|---|
| Plain text | Có | Single-line, multiline |
| Line breaks | Có | |
| Màu sắc chữ | **Có** | Color picker — unlimited color options |
| Font chữ | **Có** | Unlimited fonts — font family selector |
| Warped / Curved text | Có | Text có thể bo cong theo shape |
| Bold / Italic / Underline | **Không rõ** | Không được liệt kê trong feature list |
| Auto-resize | Có | Text tự động fit zone |
| Clip art library | Có | Theo category (sports, trophy, animal, text templates) |
| Image upload | Có | PNG/JPEG upload |
| Conditional logic | Có | Show/hide options theo selections |
| Real-time preview | Có | Live preview trên product mockup |

### Lưu ý cho hệ thống của mình

Customily là SaaS Shopify app — không thể tự host. Nếu muốn xây design tool tương tự:
- Cần Canvas/SVG-based editor có text layer với font + color picker
- Clip art + image upload layer
- Real-time preview trên product mockup
- Export PNG/SVG cho production

## Công nghệ

TrophySmack dùng **Shopify** với **Customily** (third-party product customization app — JS library, not iframe). Trong hệ thống của mình, cần xây tương tự với:
- Product blueprint schema (Drizzle/DB)
- Client-side design tool (Canvas/SVG-based preview + text/font/color/clip art/image layers)
- Variant pricing engine (server-side)
- File upload handler (R2/Images)
- Order customization data pipeline (cart → order → production)
- Conditional logic engine (show/hide zones based on variant selections)
