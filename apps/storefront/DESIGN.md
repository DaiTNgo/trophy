---
name: Prestige Excellence
colors:
  surface: '#ffffff'
  surface-dim: '#ebebeb'
  surface-bright: '#ffffff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f8f8f8'
  surface-container: '#f5f5f5'
  surface-container-high: '#efefef'
  surface-container-highest: '#e5e5e5'
  on-surface: '#232323'
  on-surface-variant: '#6b7280'
  inverse-surface: '#313030'
  inverse-on-surface: '#ffffff'
  outline: '#d7d7d7'
  outline-variant: '#e5e5e5'
  surface-tint: '#171740'
  primary: '#244159'
  on-primary: '#ffffff'
  primary-container: '#04a387'
  on-primary-container: '#ffffff'
  inverse-primary: '#288ab6'
  secondary: '#f5f5f5'
  on-secondary: '#232323'
  secondary-container: '#e9f7f4'
  on-secondary-container: '#232323'
  tertiary: '#288ab6'
  on-tertiary: '#ffffff'
  tertiary-container: '#e8f1f7'
  on-tertiary-container: '#244159'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#171740'
  primary-fixed-dim: '#288ab6'
  on-primary-fixed: '#ffffff'
  on-primary-fixed-variant: '#ffffff'
  secondary-fixed: '#e2e2e2'
  secondary-fixed-dim: '#c6c6c7'
  on-secondary-fixed: '#1a1c1c'
  on-secondary-fixed-variant: '#454747'
  tertiary-fixed: '#e2e2e2'
  tertiary-fixed-dim: '#c6c6c6'
  on-tertiary-fixed: '#1a1c1c'
  on-tertiary-fixed-variant: '#454747'
  background: '#ffffff'
  on-background: '#232323'
  surface-variant: '#f4f4f4'
typography:
  display-lg:
    fontFamily: Koulen
    fontSize: 72px
    fontWeight: '400'
    lineHeight: 72px
    letterSpacing: 0.04em
  display-lg-mobile:
    fontFamily: Koulen
    fontSize: 48px
    fontWeight: '400'
    lineHeight: 48px
    letterSpacing: 0.04em
  headline-lg:
    fontFamily: Koulen
    fontSize: 40px
    fontWeight: '400'
    lineHeight: 44px
    letterSpacing: 0.02em
  headline-md:
    fontFamily: Koulen
    fontSize: 32px
    fontWeight: '400'
    lineHeight: 36px
    letterSpacing: 0.02em
  body-lg:
    fontFamily: Open Sans
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Open Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-md:
    fontFamily: Open Sans
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  container-max: 1280px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 64px
---

## Brand & Style
The design system is engineered to evoke the prestige, precision, and legacy of high-end trophy manufacturing. It targets corporate leaders, sports organizations, and luxury event planners who value craftsmanship and achievement.

This revision aligns the storefront to the **TrophySmack sports-commerce system**: loud display type, white retail surfaces, dark-blue structural framing, blue retail-action CTAs, orange purchase-intent CTAs, and teal pricing/success accents. The emotional target is not gallery minimalism; it is confident, conversion-oriented championship merch with clear hierarchy and strong retail energy.

## Colors
This design system uses the TrophySmack palette as the brand source of truth.

- **Landing Dark Blue:** `#171740` is the heaviest brand tone. Use it for hero framing, the strongest dark surfaces, and moments that need more gravity than the standard navy.
- **Dark Blue:** `#244159` is the structural brand color for headings, navigation emphasis, borders with intent, and non-destructive primary actions.
- **Orange:** `#EA4222` is the high-intent commerce color. Reserve it for PDP purchase actions, sale urgency, and product-list pricing where the grid should feel shoppable.
- **Teal Green:** `#04A387` is used for payment completion, success cues, trust highlights, and positive states. Use it for pay/order submission, guarantee emphasis, and selected payment affordances.
- **Blue:** `#288AB6` is the supportive retail action color. Use it for checkout buttons, continue-shopping CTAs, newsletter/actions, and other non-final purchase steps.
- **Base Neutrals:** `#FFFFFF` and `#232323` remain the page floor and main text, with `#F5F5F5`, `#F8F8F8`, and `#E5E5E5` providing retail-style section separation.

## Typography
The typography strategy creates a stark contrast between "The Achievement" and "The Detail."

**Koulen** is the display face. It should carry hero lines, section titles, and large labels in uppercase with tight leading. This is a loud retail display font and should be used deliberately, but it is core to the look.

**Open Sans** is the functional counterpart. It handles forms, product details, navigation, and supporting copy with a practical ecommerce tone.

For mobile devices, display sizes scale down aggressively to maintain impact without breaking layout constraints. Supporting labels should stay bold and compact rather than airy or editorial.

## Layout & Spacing
The design system employs a **Retail Conversion Grid** for product detail pages: generous media on the left, dense merchandising and CTA stack on the right.

- **Grid:** Product detail can stay wide, but the right rail should feel packed and actionable rather than spacious and gallery-like.
- **Rhythm:** Use a visible 4/8/12/16/24/32 spacing rhythm. TrophySmack reads more retail than luxury editorial, so sections can sit tighter.
- **Mobile:** Margins shrink to 16px. CTA and price must remain immediately visible and high-contrast.

## Elevation & Depth
Depth is conveyed through **flat retail planes with selective emphasis**.

- **Level 0 (Floor):** Pure white background.
- **Level 1 (Retail Panel):** White cards with `#E5E5E5` borders and very light gray fills behind grouped tools.
- **Level 2 (Emphasis):** Use color before shadow. Orange and teal do more work than layered luxury shadows here.
- **Dividers:** Thin gray borders are standard and should be used freely for retail clarity.

## Shapes
The shape language is **retail practical**.

- **Standard Elements:** Buttons and input fields use 6px to 8px radius.
- **Large Containers:** Product shells can use 8px radius. Avoid over-rounding.
- **Icons:** Should feature slightly rounded terminals to match the UI's radius, avoiding needle-sharp points.

## Components
- **Buttons:** Use orange for PDP buy/add-to-cart actions, teal for payment/confirmation actions, blue for cart/checkout/supportive journey actions, dark blue for utility-contact actions, and white bordered buttons for secondary preview/configuration actions.
- **Cards:** Product cards and detail shells are white with gray borders and compact padding. This should feel like performant merch UI, not luxury brochure layout.
- **Input Fields:** Inputs use white fill, simple gray borders, and clear hover/focus contrast. They should feel immediately familiar.
- **Chips/Tags:** Use uppercase, compact, bold labels with white or light-gray backgrounds.
- **Lists:** Clean rows with retail-style separators and high-contrast values.
- **Role Mapping:** Product-list titles and section headings use dark blue; product-list prices use orange; cart totals stay neutral/dark; cart checkout buttons use blue; checkout pay/submit buttons and selected payment states use teal.
