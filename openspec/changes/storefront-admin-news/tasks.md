## 1. Backend Data Model & Schema

- [x] 1.1 Add `articles`, `article_categories`, `article_category_links`, and `article_product_links` tables to `apps/backend/src/db/schema.ts`.
- [x] 1.2 Model statuses with narrow string union (`draft`, `published`, `scheduled`).
- [x] 1.3 Add Vietnamese slugify helper with accent stripping and kebab-case formatting.
- [x] 1.4 Add slug collision detection and auto-suffixing helper.

## 2. Backend Admin Article APIs

- [x] 2.1 Add `apps/backend/src/routes/admin/articles.ts` with Hono RPC route exports.
- [x] 2.2 Implement `GET /api/admin/articles` with pagination, search, category, and status filters.
- [x] 2.3 Implement `POST /api/admin/articles` for new article creation.
- [x] 2.4 Implement `GET /api/admin/articles/:id` returning full article content and linked product/category IDs.
- [x] 2.5 Implement `PATCH /api/admin/articles/:id` for updating content, metadata, categories, and linked products.
- [x] 2.6 Implement `DELETE /api/admin/articles/:id`.
- [x] 2.7 Add API contract tests in `apps/backend/src/routes/admin/articles.test.ts` covering auth, CRUD, slug validation, and not-found cases.

## 3. Backend Storefront Article APIs

- [x] 3.1 Add `apps/backend/src/routes/storefront/articles.ts` under the public storefront route namespace.
- [x] 3.2 Implement `GET /api/storefront/articles` listing only published articles with category filtering and pagination.
- [x] 3.3 Implement `GET /api/storefront/articles/:slug` returning full public article data, categories, and hydrated linked products while incrementing view count.
- [x] 3.4 Add API contract tests covering published vs draft filtering, category filtering, slug resolution, and 404 responses.

## 4. Admin TipTap Editor & UI Pages

- [x] 4.1 Install `@tiptap/react`, `@tiptap/starter-kit`, and TipTap extensions in `apps/admin/package.json`.
- [x] 4.2 Build `ArticleTipTapEditor` component with Medusa-styled floating/fixed toolbar and R2 image upload handler.
- [x] 4.3 Add Articles route to `apps/admin/src/lib/sidebar-config.ts` and `apps/admin/src/App.tsx`.
- [x] 4.4 Build `ArticlesListPage` with Medusa Table, search, filters, and status badges.
- [x] 4.5 Build 2-column `ArticleEditorPage`:
  - Left pane: Title, TipTap editor, excerpt.
  - Right pane: Publish status card, featured image upload, category selector, product picker, and SEO Manager (preview, char counters, slug).
- [x] 4.6 Wire admin article API client using Hono RPC.

## 5. Storefront News Listing & Detail Routes

- [x] 5.1 Create `apps/storefront/app/routes/news.tsx`:
  - Hero banner with Barlow Condensed typography and brand narrative.
  - Category pill filter tabs and search bar.
  - Featured story card with 16:9 visual banner.
  - 3-column news grid with reading time and author.
  - Clean pagination.
- [x] 5.2 Create `apps/storefront/app/routes/news.$slug.tsx`:
  - Header with breadcrumbs, H1, date, author, category badge.
  - Sticky automatic Table of Contents (TOC) with heading anchor generation.
  - Prose content container with responsive image captions and blockquotes.
  - In-article product callout cards with "Customize Now" / "View Product" actions.
  - Social sharing buttons (Zalo, Facebook, Copy link).
  - Related articles section.
- [x] 5.3 Add React Router `meta` export for full OpenGraph and Twitter card tags.
- [x] 5.4 Inject Schema.org JSON-LD (`Article`, `BreadcrumbList`, `Product`).
- [x] 5.5 Add News link to `Navbar.tsx` and `Footer.tsx`.
- [x] 5.6 Add `/sitemap-articles.xml` endpoint for search engine crawler indexing.

## 6. Verification & Quality Assurance

- [x] 6.1 Run `pnpm --filter backend test` and `pnpm --filter backend check`.
- [x] 6.2 Run `pnpm --filter admin build`.
- [x] 6.3 Run `pnpm --filter router-cf typecheck` and `pnpm --filter router-cf build`.
- [x] 6.4 Run `./init.sh` to ensure clean baseline verification across all apps.

## 7. Follow-up hardening (publish lifecycle, featured, preview)

- [x] 7.1 Stamp `publishedAt` automatically when publishing without an explicit date; never clobber an existing publish date on re-publish (create + update in `admin/articles.ts`), with contract tests.
- [x] 7.2 Fix admin runtime crash (missing `TooltipProvider` wrapping `ui.tooltip`), register `news` i18n namespace client-side, cap sitemap pagination at 50.
- [x] 7.3 Remove breadcrumb nav from `news.tsx` per user direction.
- [x] 7.4 Add `featured` flag to `articles` schema; expose via admin create/update + DTO; storefront list returns `featured` and orders featured-first (`featured DESC, publishedAt DESC, id`).
- [x] 7.5 Relabel hero card tag to "Mới nhất"/"Latest"; show "Nổi bật"/"Featured" badge on cards where `featured` is set (storefront + admin list); add Featured checkbox in admin editor.
- [x] 7.6 Replace "View live" button with a draft-only **Preview** modal in admin (`FocusModal` rendering `contentHtml` via `.prose-article`); remove now-unused `STOREFRONT_URL` helper.
- [x] 7.7 Backend contract tests for `featured` (create, toggle via PATCH, list/detail DTO) — suite at 308 passing.
- [x] 7.8 Add `scheduled` auto-publish: cron job `lib/article-schedule-publish.ts` flips due scheduled articles to `published`; backend rejects creating/scheduling a `scheduled` article without a `publishedAt` (400), with contract + lib tests.
- [x] 7.9 Admin editor cleanup: Preview button always visible (draft + published + scheduled), preview modal shows current `form.status` badge; replace Save draft/Publish buttons with a single **Save** (persists selected status) + **Delete**.
- [x] 7.10 Scheduled status shows a `datetime-local` picker bound to `publishedAt`, so operators can pick the auto-publish time.
- [x] 7.11 Fix scheduled auto-publish not appearing: cron triggers don't fire in local dev (`vite`), so a scheduled article never flipped to `published` and stayed hidden. Storefront list/detail/categories now treat a `scheduled` article as live at query time once `publishedAt <= now` (cron remains as the prod status-label flipper). Contract tests assert the visibility predicate includes both `published` and `scheduled`; suite at 319.
