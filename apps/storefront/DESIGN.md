---
name: Prestige Excellence
colors:
  surface: '#fcf9f8'
  surface-dim: '#dcd9d9'
  surface-bright: '#fcf9f8'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f6f3f2'
  surface-container: '#f0eded'
  surface-container-high: '#eae7e7'
  surface-container-highest: '#e5e2e1'
  on-surface: '#1c1b1b'
  on-surface-variant: '#544433'
  inverse-surface: '#313030'
  inverse-on-surface: '#f3f0ef'
  outline: '#867461'
  outline-variant: '#d9c3ad'
  surface-tint: '#875200'
  primary: '#875200'
  on-primary: '#ffffff'
  primary-container: '#fea00c'
  on-primary-container: '#663d00'
  inverse-primary: '#ffb865'
  secondary: '#5d5f5f'
  on-secondary: '#ffffff'
  secondary-container: '#dcdddd'
  on-secondary-container: '#5f6161'
  tertiary: '#5d5f5f'
  on-tertiary: '#ffffff'
  tertiary-container: '#b5b5b5'
  on-tertiary-container: '#454747'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffddba'
  primary-fixed-dim: '#ffb865'
  on-primary-fixed: '#2b1700'
  on-primary-fixed-variant: '#673d00'
  secondary-fixed: '#e2e2e2'
  secondary-fixed-dim: '#c6c6c7'
  on-secondary-fixed: '#1a1c1c'
  on-secondary-fixed-variant: '#454747'
  tertiary-fixed: '#e2e2e2'
  tertiary-fixed-dim: '#c6c6c6'
  on-tertiary-fixed: '#1a1c1c'
  on-tertiary-fixed-variant: '#454747'
  background: '#fcf9f8'
  on-background: '#1c1b1b'
  surface-variant: '#e5e2e1'
typography:
  display-lg:
    fontFamily: Anton
    fontSize: 72px
    fontWeight: '400'
    lineHeight: 72px
    letterSpacing: 0.04em
  display-lg-mobile:
    fontFamily: Anton
    fontSize: 48px
    fontWeight: '400'
    lineHeight: 48px
    letterSpacing: 0.04em
  headline-lg:
    fontFamily: Anton
    fontSize: 40px
    fontWeight: '400'
    lineHeight: 44px
    letterSpacing: 0.02em
  headline-md:
    fontFamily: Anton
    fontSize: 32px
    fontWeight: '400'
    lineHeight: 36px
    letterSpacing: 0.02em
  body-lg:
    fontFamily: Hanken Grotesk
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Hanken Grotesk
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-md:
    fontFamily: Hanken Grotesk
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

The aesthetic blends **Modern Minimalism** with **High-End Editorial** influences. The UI is defined by expansive white space, sharp typographic hierarchies, and a restrained use of "Championship Gold" to highlight moments of victory. The emotional response should be one of "earned success"—clean, authoritative, and celebratory without being garish. We avoid heavy borders in favor of subtle depth to maintain a "crystal-clear" glass-like purity across the interface.

## Colors
This design system utilizes a sophisticated light-centric palette designed to mirror the materials of the products: crystal and polished alloy.

- **Primary (Championship Gold):** Used exclusively for call-to-action elements, success states, and brand-critical accents. It represents the trophy itself.
- **Surface & Backgrounds:** We use pure white (#FFFFFF) for primary surfaces to ensure maximum clarity. Light Gray (#F5F5F5) is used for secondary containers and section backgrounds to provide subtle grouping.
- **Typography:** Deep Charcoal (#1A1A1A) provides high-contrast legibility for body text, while a slightly softer charcoal (#333333) is used for secondary information.
- **Accents:** Use Tertiary Gray (#E5E5E5) for subtle structural elements like dividers or inactive states.

## Typography
The typography strategy creates a stark contrast between "The Achievement" and "The Detail." 

**Anton** is used for all major headlines. It must always be set in uppercase with slight tracking (letter-spacing) to enhance its authoritative, sporting feel. This font captures the energy of a championship win.

**Hanken Grotesk** serves as the functional counterpart. It is a clean, contemporary sans-serif that ensures technical specifications and brand narratives are highly readable. 

For mobile devices, display sizes scale down aggressively to maintain the "big-type" impact without breaking layout constraints.

## Layout & Spacing
The design system employs a **Fixed Grid** philosophy for desktop to maintain an editorial, "lookbook" feel, transitioning to a fluid model for mobile.

- **Grid:** A 12-column grid is used for desktop (1280px max width).
- **Rhythm:** A strict 8px baseline grid dictates all vertical spacing. Components are separated by large increments (64px, 80px, 128px) to emphasize a premium, uncrowded experience.
- **Mobile:** Margins shrink to 16px, and complex multi-column layouts reflow into a single-column stack. Large images of trophies should span the full width of the viewport to showcase detail.

## Elevation & Depth
Depth is conveyed through **Ambient Shadows** and **Tonal Layers** rather than borders. This mimics the way light interacts with crystal.

- **Level 0 (Floor):** Pure white or #F5F5F5 background.
- **Level 1 (Card):** White surface with an extremely soft, diffused shadow (0px 4px 20px rgba(0,0,0,0.04)).
- **Level 2 (Interactive/Hover):** The shadow tightens and darkens slightly (0px 8px 30px rgba(0,0,0,0.08)) to indicate lift.
- **Dividers:** Use color-based separation (#E5E5E5) only when necessary; prefer whitespace to define boundaries.

## Shapes
The shape language is "Rounded" (Level 2), providing a modern, friendly touch to balance the aggressive, sharp nature of the Anton typeface.

- **Standard Elements:** Buttons and input fields use a 0.5rem (8px) radius.
- **Large Containers:** Cards and product modals use a 1rem (16px) radius.
- **Icons:** Should feature slightly rounded terminals to match the UI's radius, avoiding needle-sharp points.

## Components
- **Buttons:** Primary buttons feature a solid Championship Gold background with White text. The label is Hanken Grotesk, Semi-Bold, Uppercase. Secondary buttons are ghost-style with a thick 2px gold border or a subtle gray fill.
- **Cards:** Product cards use a white background and Level 1 elevation. Images of trophies should have a light gray (#F5F5F5) background within the card to provide contrast against the white site background.
- **Input Fields:** Minimalist design with a #F5F5F5 fill and no border. Upon focus, a 2px Championship Gold bottom-border appears.
- **Chips/Tags:** Used for "Material" (e.g., *Crystal*, *Alloy*) or "Category" (e.g., *Tennis*, *Corporate*). These use a #F5F5F5 background with #1A1A1A text in uppercase label style.
- **Lists:** Clean, high-contrast rows separated by 1px #E5E5E5 lines, with generous 24px vertical padding.