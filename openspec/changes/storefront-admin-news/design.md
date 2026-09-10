# Design Document: Storefront & Admin News System

## 1. Architecture Overview

The News System spans all three monorepo packages:
1. `apps/backend`: Authoritative persistence in Cloudflare D1 with Drizzle ORM, R2 media storage, and type-safe Hono RPC endpoints.
2. `apps/admin`: React 19 SPA using `@medusajs/ui` with TipTap rich text editing, 2-column workflow, and SEO preview tools.
3. `apps/storefront`: React Router v7 SSR on Cloudflare Workers, rendering accessible semantic HTML, responsive typography, and Schema.org JSON-LD.

```
 Shopper Browser          Admin Operator
       │                         │
       ▼                         ▼
┌──────────────────┐      ┌──────────────────┐
│ apps/storefront  │      │   apps/admin     │
│ React Router SSR │      │ React 19 + TipTap│
└────────┬─────────┘      └────────┬─────────┘
         │                         │
         │ Hono RPC Client         │ Hono RPC Client (Auth Session)
         ▼                         ▼
┌────────────────────────────────────────────┐
│                apps/backend                │
│  - /api/storefront/articles (Public)       │
│  - /api/admin/articles      (Protected)    │
│  - /api/admin/product-assets (R2 Upload)   │
└──────────────────────┬─────────────────────┘
                       │
             ┌─────────┴─────────┐
             ▼                   ▼
    ┌─────────────────┐ ┌─────────────────┐
    │  Cloudflare D1  │ │  Cloudflare R2  │
    │  (SQLite DB)    │ │  (Media/Images) │
    └─────────────────┘ └─────────────────┘
```

---

## 2. Database Schema Design (D1 / Drizzle)

Added to `apps/backend/src/db/schema.ts`:

### 2.1. `articles` Table
- `id`: `text("id").primaryKey()` (CUID/UUID)
- `title`: `text("title").notNull()`
- `slug`: `text("slug").notNull().unique()` (indexed)
- `excerpt`: `text("excerpt")` (Lead summary for cards & fallback meta description)
- `contentHtml`: `text("content_html").notNull()` (Clean HTML for fast SSR rendering)
- `contentJson`: `text("content_json")` (TipTap JSON state for lossless editing)
- `featuredImageUrl`: `text("featured_image_url")`
- `featuredImageAlt`: `text("featured_image_alt")`
- `status`: `text("status", { enum: ["draft", "published", "scheduled"] }).notNull().default("draft")`
- `authorId`: `text("author_id").references(() => users.id, { onDelete: "set null" })`
- `publishedAt`: `integer("published_at", { mode: "timestamp_ms" })`
- `metaTitle`: `text("meta_title")`
- `metaDescription`: `text("meta_description")`
- `ogImageUrl`: `text("og_image_url")`
- `canonicalUrl`: `text("canonical_url")`
- `viewCount`: `integer("view_count").notNull().default(0)`
- `createdAt`: `integer("created_at", { mode: "timestamp_ms" }).notNull()`
- `updatedAt`: `integer("updated_at", { mode: "timestamp_ms" }).notNull()`

### 2.2. `articleCategories` Table
- `id`: `text("id").primaryKey()`
- `name`: `text("name").notNull()`
- `slug`: `text("slug").notNull().unique()`
- `description`: `text("description")`
- `displayOrder`: `integer("display_order").notNull().default(0)`
- `createdAt`: `integer("created_at", { mode: "timestamp_ms" }).notNull()`

### 2.3. Join Tables
- `articleCategoryLinks`: `(articleId, categoryId)` composite primary key
- `articleProductLinks`: `(articleId, productId, displayOrder)` composite primary key linking relevant store products to articles.

---

## 3. Backend API Contracts (Hono RPC)

### 3.1. Admin Route Surface (`/api/admin/articles`)
- `GET /api/admin/articles`: List articles with pagination (`page`, `limit`), search (`q`), category filter, status filter.
- `POST /api/admin/articles`: Create article (requires title, generates default slug, validates unique slug).
- `GET /api/admin/articles/:id`: Get full article by ID (including `contentJson` and linked category/product IDs).
- `PATCH /api/admin/articles/:id`: Update article fields, content, status, SEO metadata, categories, and linked products.
- `DELETE /api/admin/articles/:id`: Delete article.

### 3.2. Storefront Route Surface (`/api/storefront/articles`)
- `GET /api/storefront/articles`: List published articles only (`status = 'published'` and `publishedAt <= now()`). Supports category slug filtering, keyword search, pagination.
- `GET /api/storefront/articles/:slug`: Resolve single published article by slug. Increments `viewCount`. Returns article details, categories, and hydrated linked products (title, handle, price, thumbnail).

---

## 4. Admin UI Architecture & TipTap Rich-Text Editor

### 4.1. TipTap Integration
- **Package**: `@tiptap/react` + `@tiptap/starter-kit` + `@tiptap/extension-image` + `@tiptap/extension-link` + `@tiptap/extension-table` + `@tiptap/extension-table-row` + `@tiptap/extension-table-cell` + `@tiptap/extension-table-header` + `@tiptap/extension-youtube` + `@tiptap/extension-placeholder`.
- **Styling**: Tailored with `@medusajs/ui` components and Tailwind typography (`prose`).
- **Image Upload Handler**: Intercepts image paste/drop, uploads file to backend R2 via `productAssetsRoute`, inserts image node with returned CDN URL and prompts for `alt` text.

### 4.2. Layout Structure (`apps/admin/src/pages/articles/`)
- `ArticlesListPage`: Medusa Table, search input, category select, status badges, "New Article" CTA.
- `ArticleEditorPage` (2-column layout):
  - **Left Pane (70%)**:
    - Large borderless title input (auto-generates slug).
    - TipTap editor with floating or fixed Medusa-styled toolbar.
    - Excerpt textarea with character count indicator.
  - **Right Pane (30%)**:
    - **Publish Card**: Status toggle (Draft / Published), date picker, Save / Publish buttons, View Live link.
    - **Featured Media Card**: Upload zone with 16:9 preview.
    - **Taxonomy Card**: Category checkboxes, tag pill inputs.
    - **Related Products Card**: Multi-select modal linking catalog products.
    - **SEO Card**: Google Search SERP snippet preview, Meta Title counter (target 50-60 chars), Meta Description counter (target 140-160 chars), Slug editor, Canonical URL input.

---

## 5. Storefront UI Architecture & SEO Strategy

### 5.1. Routes & Components (`apps/storefront/app/`)
- `routes/news.tsx`:
  - `HeroSection`: Barlow Condensed heading, brand narrative, category pills, search input.
  - `FeaturedStory`: Highlighted top article with large 16:9 banner and CTA.
  - `NewsGrid`: 3-column card grid with hover micro-animations.
  - `NewsPagination`: Clean page navigation.
- `routes/news.$slug.tsx`:
  - `ArticleHeader`: Breadcrumbs, category badge, H1, publication date, author, reading time estimate.
  - `StickyTableOfContents`: Client hook/component extracting `<h2>` and `<h3>` tags with smooth scroll to generated anchor IDs.
  - `ArticleProse`: Tailwind typography prose container rendering `contentHtml`.
  - `InArticleProductCallout`: Product card preview for referenced trophies with direct "Customize Now" / "View Product" actions.
  - `RelatedArticles`: 3 cards sharing the same category.
  - `SocialShareButtons`: Share to Zalo, Facebook, and copy link.

### 5.2. SEO & Structured Data (JSON-LD)
React Router `meta` export generates:
- `<title>`, `<meta name="description">`, `<link rel="canonical">`.
- `og:title`, `og:description`, `og:image`, `og:type=article`, `article:published_time`, `article:author`.
- `twitter:card=summary_large_image`.
- Embedded `<script type="application/ld+json">`:
  - `Article` / `BlogPosting` schema (headline, image, author, datePublished, publisher).
  - `BreadcrumbList` schema.
  - `Product` schema snippets for linked products.
