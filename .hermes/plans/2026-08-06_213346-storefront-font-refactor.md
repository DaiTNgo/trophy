# Storefront Inter + Barlow Condensed Typography Refactor Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Keep Inter as the primary storefront typeface and introduce Barlow Condensed only for product, campaign, and section display hierarchy, without changing marquee behavior.

**Architecture:** Tailwind v4 font tokens in `app/app.css` will make the existing semantic utilities (`font-body`, `font-label`, `font-heading`) intentional and global. `font-body` and `font-label` resolve to Inter, while `font-heading` resolves to Barlow Condensed. The root document will request the two Google Fonts families and the design document will become the source of truth for their scope and weights.

**Tech Stack:** React Router 8, React 19, Tailwind CSS v4, Google Fonts, TypeScript, pnpm.

---

## Design decision and scope

### Chosen pairing

| Role        | Font             | Weights                 | Usage                                                                                               |
| ----------- | ---------------- | ----------------------- | --------------------------------------------------------------------------------------------------- |
| Body and UI | Inter            | 400, 500, 600, 700, 800 | Navigation, controls, prices, product names, descriptions, forms, metadata                          |
| Display     | Barlow Condensed | 500, 600, 700           | Hero title, listing hero title, section headings, key category titles, checkout/form section titles |

Both families have a Vietnamese subset from Google Fonts. Barlow Condensed is deliberately restricted to semantic display elements. It must not be used for long copy, prices, form controls, checkout values, or legal/footer body text.

### Explicitly out of scope

- Do not change `QuoteTicker.tsx`, `PartnerLogosSection.tsx`, `product-marquee-section.tsx`, or marquee animation CSS.
- Do not change page copy, translations, product data, prices, imagery, layout structure, API contracts, or interaction behavior.
- Do not add a theme switcher or a third font family.
- Do not load a remote font per component. The root document owns the single font stylesheet request.

### Acceptance criteria

- Inter remains the default body font across the entire storefront.
- Existing `font-heading` elements resolve to Barlow Condensed everywhere they appear.
- Existing `font-body` and `font-label` elements explicitly resolve to Inter.
- The root Google Fonts request includes `Inter` and `Barlow Condensed` weights required by the defined roles, with `display=swap`.
- Hero and product-listing hero headings stay readable, fit their intended desktop and mobile bounds, and do not rely on 3-plus line display treatment at desktop.
- Marquee visuals and behavior remain byte-for-byte unchanged in their components.
- `apps/storefront/DESIGN.md` documents the actual type system instead of the old Koulen/Open Sans claim.
- Storefront typecheck and production build pass.

---

### Task 1: Establish semantic font tokens in Tailwind v4

**Objective:** Make `font-heading`, `font-body`, and `font-label` deterministic Tailwind utilities with the intended typeface mapping.

**Files:**

- Modify: `apps/storefront/app/app.css:4-91` and `apps/storefront/app/app.css:169-180`
- Do not modify: `apps/storefront/app/components/home/QuoteTicker.tsx`
- Do not modify: `apps/storefront/app/components/home/PartnerLogosSection.tsx`

**Step 1: Add font-family theme tokens**

Inside the existing `@theme` block, add semantic font tokens:

```css
--font-body: "Inter", ui-sans-serif, system-ui, sans-serif;
--font-label: "Inter", ui-sans-serif, system-ui, sans-serif;
--font-heading: "Barlow Condensed", "Arial Narrow", ui-sans-serif, sans-serif;
```

Do not add display tokens that are not used by the component tree. The three established class names are sufficient.

**Step 2: Make the page floor explicit**

Keep the base `html, body` rule on Inter, but use the same fallback stack as `--font-body` so default text remains stable before or if the remote font fails:

```css
font-family: "Inter", ui-sans-serif, system-ui, sans-serif;
```

Keep the existing color, size, line-height, and scroll rules unchanged.

**Step 3: Verify generated utilities locally**

Run:

```bash
pnpm --filter router-cf build
```

Expected: successful build. Inspect the generated CSS or browser computed styles afterwards to confirm `.font-heading` references Barlow Condensed and `.font-body` / `.font-label` reference Inter.

**Step 4: Commit (only when requested)**

```bash
git add apps/storefront/app/app.css
git commit -m "style(storefront): define Inter and Barlow typography tokens"
```

Do not commit unless the user explicitly asks.

---

### Task 2: Load exactly the selected Google Fonts at the document root

**Objective:** Replace the Inter-only Google Fonts request with a single stylesheet request for the chosen pairing.

**Files:**

- Modify: `apps/storefront/app/root.tsx:26-37`

**Step 1: Preserve the existing preconnects**

Keep the two current connections to `fonts.googleapis.com` and `fonts.gstatic.com`, including `crossOrigin="anonymous"` on the latter.

**Step 2: Replace the stylesheet href**

Set the existing stylesheet link to this family request:

```ts
{
  rel: "stylesheet",
  href: "https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600;700&family=Inter:wght@400;500;600;700;800&display=swap",
}
```

Do not add a second stylesheet link and do not retain Koulen/Open Sans links.

**Step 3: Verify supported Vietnamese glyph delivery**

Open the Google Fonts stylesheet URL in a browser and confirm it contains `/* vietnamese */` `@font-face` entries for both families. This has already been confirmed for Barlow Condensed and Inter must be checked again at implementation time.

**Step 4: Verify root rendering**

Run:

```bash
pnpm --filter router-cf build
pnpm --filter router-cf preview -- --host 127.0.0.1 --port 4173
```

Open `http://localhost:4173/`; in browser computed styles, confirm body text uses Inter and a `font-heading` heading resolves to Barlow Condensed once fonts have loaded.

**Step 5: Commit (only when requested)**

```bash
git add apps/storefront/app/root.tsx
git commit -m "style(storefront): load Barlow Condensed display font"
```

---

### Task 3: Calibrate the two largest display surfaces for Barlow Condensed

**Objective:** Preserve visual hierarchy after the more condensed display face replaces the previous generic heading stack.

**Files:**

- Modify: `apps/storefront/app/components/home/HeroSection.tsx:58-96`
- Modify: `apps/storefront/app/components/products/ProductListingShell.tsx:125-136`
- Do not modify: marquee components

**Step 1: Inspect the actual translated headline lengths before changing classes**

Check both Vietnamese and English `hero_slides` translation values and the product-listing title values. Record the longest actual headline per locale. Do not add manual line breaks or change copy in this refactor.

**Step 2: Tune only font sizing and line-height where Barlow changes wrapping**

For `HeroSection.tsx`, retain `font-heading` and ensure the desktop display has a readable line-height that does not clip Vietnamese marks. Target a maximum of two headline lines on desktop for the active slide when content permits. If the current `lg:text-[72px]` produces excessive vertical height, reduce the display size rather than adding padding or forced `<br>` tags.

For `ProductListingShell.tsx`, retain `font-heading`, retain the existing responsive type hierarchy, and adjust only the listing heading's `leading` and responsive size if Barlow Condensed makes it too compressed or allows the text to become disproportionately large.

**Step 3: Preserve UI fonts**

Do not add `font-heading` to any of these UI roles:

- Navigation labels in `apps/storefront/app/components/layout/Navbar.tsx`
- Search field text
- Product price in `apps/storefront/app/components/shared/ProductCard.tsx`
- Checkout inputs, labels, totals, and order values
- Footer links and contact content in `apps/storefront/app/components/layout/Footer.tsx`

These remain Inter through the body, label, and existing non-display font classes.

**Step 4: Desktop visual check**

At 1280px width, check the homepage and `/products`:

- Navbar remains one line and at or below its current height.
- Hero CTA buttons remain visible without scrolling within the initial viewport.
- Hero text is legible over its image overlay.
- No heading clips Vietnamese diacritics.
- Product-listing hero heading remains readable and does not overflow its `max-w-[640px]` container.

**Step 5: Mobile visual check**

At 375px and 768px widths, check the same surfaces:

- Hero display does not overflow horizontally.
- Heading line-height has sufficient vertical clearance.
- CTA labels stay one line when enough space exists, otherwise layout remains intentionally stacked.
- Product-listing hero has no clipped title or horizontal scroll.

**Step 6: Commit (only when requested)**

```bash
git add apps/storefront/app/components/home/HeroSection.tsx apps/storefront/app/components/products/ProductListingShell.tsx
git commit -m "style(storefront): calibrate Barlow display hierarchy"
```

---

### Task 4: Audit semantic heading usage without broad styling churn

**Objective:** Confirm the existing semantic typography utilities apply the selected pairing across storefront screens and correct only genuine role mismatches.

**Files:**

- Inspect: `apps/storefront/app/components/home/*.tsx`
- Inspect: `apps/storefront/app/components/layout/Footer.tsx`
- Inspect: `apps/storefront/app/components/product/*.tsx`
- Inspect: `apps/storefront/app/components/checkout/*.tsx`
- Inspect: `apps/storefront/app/components/cart/*.tsx`
- Inspect: `apps/storefront/app/routes/about.tsx`
- Modify only where a long paragraph, form field, price, or UI label incorrectly uses `font-heading`, or where a visual section title lacks it.

**Step 1: Establish role rules before edits**

Apply these rules consistently:

- `font-heading`: semantic `h1` through `h4` display headings and short campaign/section titles only.
- `font-body`: paragraphs, product names, product prices, descriptions, list items, checkout values, and card content.
- `font-label`: navigation, buttons, short labels, compact metadata, and form labels.

**Step 2: Audit the known high-impact sites**

Review these existing locations first:

- Home: `HeroSection.tsx`, `CategoriesSection.tsx`, `BestSellersSection.tsx`, `ManufacturerSection.tsx`, `ReviewsSection.tsx`, `SeoIntroSection.tsx`, `NewsletterSection.tsx`
- Product listing: `ProductListingShell.tsx`
- Product detail: `ProductInfo.tsx`, `ProductMobileActionBar.tsx`, `ProductOptionGroups.tsx`
- Checkout: `CheckoutForm.tsx`, `CheckoutSummary.tsx`, `OrderSummary.tsx`
- Cart: `CartItemList.tsx`, `OrderSummary.tsx`
- Footer: `Footer.tsx`

**Step 3: Limit edits to semantic misuse**

Examples of valid corrections:

- A price rendered with `font-heading` should move to `font-body` or plain inherited Inter.
- A short section heading that already is `font-heading` needs no component change because the token mapping now supplies Barlow Condensed.
- A paragraph that already uses `font-body` needs no component change.

Do not mechanically touch every component merely to create a large diff.

**Step 4: Protect excluded components**

Confirm no changes are made to the markup, classes, keyframes, or animation timing in:

```text
apps/storefront/app/components/home/QuoteTicker.tsx
apps/storefront/app/components/home/PartnerLogosSection.tsx
apps/storefront/app/components/about/product-marquee-section.tsx
```

**Step 5: Verify with a focused diff review**

Run:

```bash
git diff --check
git diff -- apps/storefront/app/components/home/QuoteTicker.tsx apps/storefront/app/components/home/PartnerLogosSection.tsx apps/storefront/app/components/about/product-marquee-section.tsx
```

Expected: whitespace check succeeds and the three marquee component diffs are empty.

**Step 6: Commit (only when requested)**

```bash
git add apps/storefront/app/components apps/storefront/app/routes
git commit -m "style(storefront): align semantic typography roles"
```

---

### Task 5: Align the design specification with the implemented font system

**Objective:** Remove the stale Koulen/Open Sans direction and document the actual typography contract for future storefront work.

**Files:**

- Modify: `apps/storefront/DESIGN.md:51-91` and `apps/storefront/DESIGN.md:122-141`

**Step 1: Update the YAML typography block**

Replace Koulen and Open Sans declarations with:

- Inter for body, labels, navigation, forms, product cards, prices, and metadata.
- Barlow Condensed for display and heading roles only.

Keep the existing approved type-size scale unless Task 3 establishes a necessary, verified adjustment for headings.

**Step 2: Rewrite the prose typography guidance**

State plainly:

- Inter is the primary UI font because the storefront serves Vietnamese commerce flows and needs high legibility.
- Barlow Condensed provides a controlled championship and recognition character for short display headings.
- Do not use Barlow Condensed for paragraphs, prices, form fields, support information, or legal content.
- Google Fonts delivery must include Vietnamese subsets and use `font-display: swap`.

**Step 3: Add an implementation reference**

Name `apps/storefront/app/app.css` as the semantic token source and `apps/storefront/app/root.tsx` as the single Google Fonts loader. This prevents contributors from adding local font imports or per-component font URLs.

**Step 4: Commit (only when requested)**

```bash
git add apps/storefront/DESIGN.md
git commit -m "docs(storefront): document Inter and Barlow type system"
```

---

### Task 6: Complete visual, accessibility, and build verification

**Objective:** Verify that the refactor is visually correct, does not change marquee behavior, and leaves the storefront restartable.

**Files:**

- No implementation changes expected unless a verification failure reveals a scoped issue.

**Step 1: Run static verification**

```bash
pnpm --filter router-cf typecheck
pnpm --filter router-cf build
git diff --check
```

Expected: all commands exit successfully. Document any known Wrangler sandbox log warning separately only if it does not fail the command.

**Step 2: Run a production-preview smoke test**

```bash
pnpm --filter router-cf preview -- --host 127.0.0.1 --port 4173
```

Check these routes in desktop and mobile viewports:

```text
/
/products
/categories/<a-real-category-handle>
/categories/<a-real-category-handle>/products/<a-real-product-handle>
/cart
/checkout
```

Use real handles returned by the local/preview API rather than inventing route data.

**Step 3: Audit computed font styles**

In browser devtools, inspect:

- `body` and a product price: Inter
- Navbar label and checkout label: Inter
- Home H1 and product-listing H1: Barlow Condensed
- Home section H2 and product-detail title: Barlow Condensed

Confirm browser font loading supplies Vietnamese glyphs without a fallback font for text containing `PHÙNG THỊ`, `Cúp vinh danh`, `Kỷ niệm chương`, and `Tùy chỉnh`.

**Step 4: Accessibility and pre-flight checks**

- Check headings for clipped Vietnamese diacritics at 375px, 768px, and 1280px.
- Confirm no horizontal overflow in the hero or product listing.
- Confirm CTAs are legible and do not wrap at desktop.
- Confirm no marquee source files changed, and their existing motion behavior still runs.
- Confirm the homepage contains no new em dash characters in visible copy.
- Respect the existing light retail theme. This refactor must not create section-level dark theme changes.

**Step 5: Record evidence if implementation is completed**

Because this is non-OpenSpec storefront work, update the active repo state files after successful implementation:

- `feature_list.json` with the implementation evidence if it is valid JSON. The current file is documented as pre-existing invalid JSON, so do not corrupt it further. Record the limitation in `progress.md` instead if it remains invalid.
- `progress.md` with the concrete font pairing, changed files, verification commands, and any known environment warnings.
- `session-handoff.md` with the final state or a concise blocker if verification cannot complete.

Do not create a migration and do not change backend or admin code.

---

## Risks and mitigations

| Risk                                                                    | Mitigation                                                                                                                              |
| ----------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Condensed headings become too narrow or too large on Vietnamese content | Audit the longest localized headline first and tune only hero/listing display sizes after loading the actual font.                      |
| Font request adds layout shift                                          | Keep `display=swap`, use the existing preconnects, constrain hero/listing dimensions, and test initial render.                          |
| A broad class replacement changes body UI unexpectedly                  | Do not run a blind replacement. Token mapping handles the existing semantic classes, and Task 4 limits edits to verified role mistakes. |
| Marquee behavior changes while editing nearby home code                 | Treat the three named marquee files as protected. Verify their diffs are empty.                                                         |
| Existing design docs mislead later contributors                         | Update `DESIGN.md` in the same refactor.                                                                                                |

## Final checklist

- [ ] `font-heading` maps to Barlow Condensed.
- [ ] `font-body` and `font-label` map to Inter.
- [ ] `root.tsx` loads only the selected Google Fonts pairing for storefront typography.
- [ ] Desktop and mobile hero/listing headings are readable without clipping or horizontal overflow.
- [ ] Product prices, forms, nav, footer links, and body text remain Inter.
- [ ] No marquee component or marquee CSS was changed.
- [ ] `DESIGN.md` matches the implementation.
- [ ] `pnpm --filter router-cf typecheck`, `pnpm --filter router-cf build`, and `git diff --check` pass.
