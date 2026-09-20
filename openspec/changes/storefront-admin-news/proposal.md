## Why

Storefront currently lacks a news/blog content system to share industry insights, crystal trophy craftsmanship guides, event gift consultation (grand opening, inauguration, corporate milestones), and SEO-driven educational content. The old website (`kyniemchuongphungthi.com/category/tin-tuc/`) holds high-value conversion content but uses an outdated WordPress interface that does not match the modern brand identity of PHÙNG THỊ.

Operators need a professional, Medusa-styled publishing interface in the Admin app powered by a React 19-native rich text editor (TipTap) to author articles, upload media to Cloudflare R2, configure SEO metadata, and link related products directly into articles to drive storefront sales conversion.

Shoppers and search engines need a fast, elegant, server-side rendered (SSR) news experience on the Storefront (`/news` and `/news/:slug`) complete with automatic Table of Contents, responsive typography, in-article product callouts, and structured Schema.org JSON-LD data.

## What Changes

- **Backend (`apps/backend`)**:
  - Add D1/Drizzle database schema: `articles`, `article_categories`, `article_category_links`, and `article_product_links`.
  - Add Hono RPC routes under `/api/admin/articles` for authenticated operator CRUD, publishing status lifecycle, and media upload.
  - Add Hono RPC routes under `/api/storefront/articles` for public published article listings (with category filter and pagination) and detail resolution by slug.
  - Add API contract tests covering success, validation failures, slug conflicts, and shopper-safe vs admin-only boundaries.

- **Admin App (`apps/admin`)**:
  - Add TipTap v2/v3 rich text editor (`@tiptap/react`, `@tiptap/starter-kit`, image upload, tables, links, blockquotes).
  - Add Articles navigation item to the primary admin sidebar.
  - Add Articles list page (`/articles`) with status badges (draft, published, scheduled), search, category filters, and quick metrics.
  - Add 2-column Article Editor (`/articles/new` & `/articles/:id`):
    - Left column (70%): Title input, TipTap rich text editor, excerpt/lead summary.
    - Right column (30%): Publishing controls, featured image upload & preview, category/tags selector, related product picker, and SEO Manager (Google search snippet preview, meta title/description counters, slug customizer, canonical URL, OG image).

- **Storefront App (`apps/storefront`)**:
  - Add news listing route at `/news` with hero banner, category filters, featured story card, 3-column bento news grid, search, and pagination.
  - Add article detail route at `/news/:slug` with breadcrumbs, H1 header, featured image, sticky automatic Table of Contents (TOC) generated from `<h2>`/`<h3>`, editorial prose typography, in-article product callout cards, social sharing, and related articles.
  - Support full SSR with React Router v7 `meta` function (title, description, canonical, OpenGraph, Twitter card) and Schema.org JSON-LD (`Article`, `BreadcrumbList`, `Product`).
  - Add news link to Navbar and Footer.
  - Add `/sitemap-articles.xml` endpoint for search engine indexing.

## Capabilities

### New Capabilities

- `news-management`: Admin article authoring, TipTap rich-text editing, R2 image upload, category organization, related product linking, and SEO metadata configuration.
- `storefront-news`: Public server-rendered news listing (`/news`), detail reading experience (`/news/:slug`), automatic Table of Contents, in-article product cards, and structured SEO markup.

### Modified Capabilities

- None.

## Impact

- `apps/backend`: Drizzle schema updates in `schema.ts`, new admin routes in `src/routes/admin/articles.ts`, new storefront routes in `src/routes/storefront/articles.ts`, test suites.
- `apps/admin`: New dependencies (`@tiptap/react`, `@tiptap/starter-kit`, etc.), new route entries in `App.tsx`, sidebar config in `sidebar-config.ts`, pages in `src/pages/articles/`.
- `apps/storefront`: New routes `app/routes/news.tsx` and `app/routes/news.$slug.tsx`, components in `app/components/news/`, navigation links in `Navbar.tsx` and `Footer.tsx`.
- Dev mode: Direct D1 schema changes without migration authoring.
