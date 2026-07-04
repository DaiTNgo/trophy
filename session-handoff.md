# Session Handoff

## Product-Owned Customization PRD
- Created `CONTEXT.md` with domain terms for customizable products, embedded product customization, selected variant backgrounds, background size contract, and customization publish readiness.
- Created ADR `docs/adr/0001-product-owned-customization.md`: customization belongs to the product lifecycle; replace standalone `customization_templates` / `customization_template_revisions` with one-to-one `product_customizations`; background images are derived from variant media; store canvas dimensions with customization config.
- Published PRD as local markdown issue `.scratch/issues/product-owned-customization-prd.md` with `ready-for-agent` metadata because issue tracker setup is absent and `gh` was unavailable.
- Proposed OpenSpec change `product-owned-customization` under `openspec/changes/product-owned-customization/`; proposal, design, specs, tasks, progress, and session handoff are present and `openspec validate product-owned-customization --strict` passes.
- Main implementation direction: backend full-create product endpoint; product-owned customization config; variant media relationship with stable position; admin create product customization tab after Variants; publish blocked for customizable products until variant images, image dimensions, and editor model are valid.

## Current State
- Storefront SSR/hydration check on 2026-07-04 found no hydration warnings in browser automation for `/`, `/cart`, `/checkout`, `/customize`, or `/products` after the fix. The reproduced failure was SSR loader/API related: `/products` returned 500 because storefront server loaders defaulted to `http://127.0.0.1:8787`, but the backend dev server was reachable at `http://localhost:8787` and not `127.0.0.1:8787`. Updated the fallback URL in `apps/storefront/app/lib/api.ts`, `apps/storefront/app/components/CupCustomizer.tsx`, `apps/storefront/app/routes/customize.tsx`, and `apps/storefront/app/routes/customize.$templateId.tsx`. Verified with `pnpm --filter router-cf typecheck`, preview build, curl `/products` returning 200, Playwright reload checks with no console errors, and `./init.sh`.
- Set up the storefront home page based on the Stitch UI mockup for the "Hệ Thống Kỷ Niệm Chương" project.
- Converted the HTML to React JSX and configured Tailwind v4 using `@config` from a generated `tailwind.config.js` to preserve the precise colors, fonts, and sizing tokens.
- Google Fonts (Anton, Hanken Grotesk, Material Symbols Outlined) included in `root.tsx`.
- Refactored `home.tsx` according to `react-component-architecture` skill. Created separate custom hooks (`useScrollReveal`, `useNavbarScroll`) and UI components (`Navbar`, `HeroSection`, `BestSellersSection`, `ManufacturerSection`, `CategoriesSection`, `TrustedBrandsSection`, `ProductCard`, `Footer`).
- Successfully built and type-checked the storefront.
- Planned storefront public product APIs. Created ADR `docs/adr/0002-storefront-product-api-boundary.md` and PRD `.scratch/issues/storefront-product-apis-prd.md` with `ready-for-agent` metadata. The agreed contract is: public `/api/storefront/products`, published-only, no auth/credentials, listing supports `q`, `category`, `page`, `limit`, search is part of listing, detail loads by handle, Contact Price is represented by `priceAmount: null`, and admin catalog APIs stay separate.
- Proposed OpenSpec change `storefront-product-apis`; proposal, design, specs, tasks, progress, and session handoff are present under `openspec/changes/storefront-product-apis/`.

## Next Steps
- Implement the storefront product APIs from `openspec/changes/storefront-product-apis/tasks.md`.
- Replace storefront product listing/detail mock data with the new public API once backend routes exist.
- Verify the design in the browser and apply any necessary adjustments based on feedback.
