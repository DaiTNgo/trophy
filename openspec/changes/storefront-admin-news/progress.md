# OpenSpec Change: storefront-admin-news

## Current Status

- **Phase**: Implementation complete — Sections 1-6 in `tasks.md` checked; follow-up hardening (Section 7) complete as of 2026-09-11; bilingual admin editor + storefront locale passing (Section 8) complete as of 2026-09-13.
- **OpenSpec Change Folder**: `openspec/changes/storefront-admin-news/`

## Session 2026-09-11 (tasks 7.8–7.11: schedule auto-publish + editor cleanup + due-scheduled visibility)

- **Auto-publish (`scheduled`)**: new `apps/backend/src/lib/article-schedule-publish.ts` cron job flips due `scheduled` articles (`publishedAt <= now`) to `published`; wired into the Worker `scheduled` handler in `src/index.ts`. Backend now enforces that a `scheduled` article carries a `publishedAt` on both create and PATCH (400 otherwise). Covered by 2 new lib tests + 1 new PATCH contract test.
- **Editor cleanup**: Preview button now always visible (previously draft-only, so published/scheduled/new articles had no preview); modal title/badge reflect current `form.status` (Draft/Scheduled/Published). Replaced "Save draft" + "Publish" buttons with a single **Save** that persists the selected status + **Delete**.
- **Schedule time picker**: when `Status = Scheduled`, a `datetime-local` input appears bound to `publishedAt` (`toDatetimeLocal`/`fromDatetimeLocal` helpers); saved as timestamp so the cron auto-publishes at that time.
- **BUG (7.11) — scheduled article never appears on /news**: root cause was environment, not data: local dev runs `vite` (not `wrangler dev`), so cron triggers never fire and the `scheduled → published` flip never happens; the storefront only queried `status = 'published'`. Fixed deterministically at query time: storefront list, detail, and category counts now treat a `scheduled` article as live once `publishedAt <= now` (`inArray(status, ["published","scheduled"])` + `lte(publishedAt, now)`). Contract tests assert the visibility predicate carries both statuses (list + detail); mock DB now records `where` predicates.
- **Auto-flip (7.12) — status tự chuyển sang published**: new `lib/article-publish.ts` (`flipDueScheduledArticles` updates the row to `published` when `publishedAt <= now`; `markRowsPublished` reflects it in the DTO). Called on read in storefront list/detail and admin list/detail, so the DB status self-updates deterministically in every environment — local dev included, where the cron never runs. The Worker cron (`lib/article-schedule-publish.ts`) stays as the prod batch cleaner. Contract tests: storefront list flip, storefront detail flip, future-dated article stays `scheduled` (no mutation), admin list flip. Suite at **322 / 47 files**.
- **Known remaining scope (outside this session)**: storefront article fetches and admin editor localized (vi/en) `*Translations` wiring from the multilang plan is still pending — backend routes/DTOs are done, `lib/articles-client.ts` types are ready, but the editor form does not yet submit `*Translations` and storefront `api.ts`/news routes do not yet pass `?locale=`.

## Session 2026-09-13 (tasks 8.1–8.4: bilingual admin editor + storefront locale passing)

- **Bilingual admin editor (8.1)**: `article-editor.tsx` now manages a `TranslationsState` (7 `LocalizedTextValue` fields) plus 5 per-field locale states; a `setTranslation` helper keeps the canonical VI fields in sync with translations for slug generation, SEO preview and the preview modal. Title, excerpt, featuredImageAlt, metaTitle, metaDescription all replaced with `LocalizedTextField` (`requiredLocales={["vi"]}`); counters dynamically reflect the currently-selected locale. `persist()` now sends all 7 `*Translations` payloads alongside the existing canonical fields. A `key={id}` on `ArticleTipTapEditor` forces remount when switching between articles.
- **Locale-aware TipTap editor (8.2)**: `ArticleTipTapEditor` accepts `valueByLocale: Record<AdminLocale, {html,json}>` + `onChangeByLocale(locale, {html,json})`. Adds a header row with the field label and a `LanguageSwitch` (compact, showing missing-locale underlines). A `useEditorLocaleSync` effect swaps `editor.commands.setContent` when the operator switches language. `Placeholder` reads a ref updated on locale switch (avoids re-initialising the editor). Form parent uses functional `setTranslations` + conditional `setForm` for vi to avoid the stale-closure stale-state bug where `onUpdate` (created once at mount) would clobber the other locale's content.
- **Storefront locale passing (8.3)**: `fetchStorefrontArticles`, `fetchStorefrontArticle`, `fetchStorefrontArticleCategories` all accept `locale: string` and append `?locale=` to the backend URL (matching the pattern used by the existing product/category fetchers in the same file). `news.tsx` and `news.$slug.tsx` now pass `getLocale(context)` to all three fetches.
- **Verification (8.4)**: No backend changes required — storefront `GET /api/storefront/articles/categories` already accepted a `locale` query param. Admin build passes cleanly; `router-cf typecheck` passes cleanly.

## Verification Evidence

- `pnpm --filter backend test`: 322 passed (47 files) — no backend changes this session.
- `pnpm --filter backend check`: clean.
- `pnpm --filter backend build`: clean.
- `pnpm --filter admin build`: clean (chunk-size warning only, pre-existing).
- `pnpm --filter router-cf typecheck`: clean.

## Follow-up session 2026-09-10 (Tasks 7.x)

- **Publish lifecycle**: `createArticleSchema`/update in `apps/backend/src/routes/admin/articles.ts` now auto-stamp `publishedAt` when `status: "published"` is set without a date, and never overwrite an existing publish date when re-publishing. Fixed the "publishing doesn't appear on /news" bug (SQL `lte(NULL, now)` never matched).
- **Runtime fixes**: wrapped admin app in `TooltipProvider` (TipTap editor crash); registered `news` i18n namespace in `entry.client.tsx`; sitemap article pagination capped at 50; removed breadcrumb from `news.tsx`.
- **Featured / Latest**: added `featured` column (`schema.ts`), admin create/update/DTO + Featured checkbox in the editor Publish card, "Featured" badge in admin list, storefront list sorted `featured DESC, publishedAt DESC, id`; hero card tag renamed to **"Mới nhất"/"Latest"**, cards show **"Nổi bật"/"Featured"** badge.
- **View live → Preview (Option A)**: draft-only Preview button opens a `FocusModal` rendering featured image, title, categories, date, excerpt, and `contentHtml` via `.prose-article`; no button for published. Removed the unused `STOREFRONT_URL` export from `apps/admin/src/lib/fetch.ts`.
- **Contracts**: `featured` covered by backend API tests (create persists, PATCH toggle, list/detail DTO), `publishedAt` stamping covered. Suite at **308 tests passed**.

## Verification Evidence

- `pnpm --filter backend test`: 308 passed (46 files).
- `pnpm --filter backend check`: clean.
- `pnpm --filter backend build`: clean.
- `pnpm --filter admin build`: clean (chunk-size warning only, pre-existing).
- `pnpm --filter router-cf typecheck`: clean.
- `pnpm --filter router-cf build`: clean.
- `./init.sh`: full baseline verification passes.
- Flake note: one transient `./init.sh` run reported 7 failures in `articles.test.ts` (PATCH 200 vs 500 on an empty mock queue) that did not reproduce across 5 subsequent standalone + full `./init.sh` runs; suspected worker-contention flake in the shared `getDb` mock, not reproduced by these changes.

## What Was Done This Session (Tasks 4-6)

### Admin (Section 4)
- TipTap v3 editor (`ArticleTipTapEditor`) with R2 image upload, paste/drop handling, toolbar (bold/italic/headings/lists/link/table/youtube/undo/redo), Medusa-styled.
- `ArticlesListPage` (Medusa Table, search, status/category filters, delete), `ArticleEditorPage` (2-column: content editor left; publish/featured media/category/product-picker/SEO right).
- `ProductLinkPicker` modal, `articles-client.ts` via `backendFetch` (Hono RPC body types not inferable with manual `parseJson` — documented blocker per AGENTS.md).
- Admin sidebar "News" item + `App.tsx` routes wired; TipTap content styles in `index.css`.

### Storefront (Section 5)
- `routes/news.tsx`: SSR loader via `getBackendServiceFetch`, hero banner (Barlow Condensed), search bar, category pill filter tabs, featured story card (16:9), 3-column grid with author + reading time, clean pagination.
- `routes/news.$slug.tsx`: SSR loader, breadcrumbs, H1/date/author/category badge, sticky auto-TOC (`StickyTableOfContents` — generates heading anchor IDs client-side), prose content, product callout cards, related articles, social share (Zalo/Facebook/Copy), Schema.org JSON-LD (`Article`, `BreadcrumbList`, `Product`), full OpenGraph + Twitter meta.
- `components/news/`: `sticky-table-of-contents.tsx`, `social-share-buttons.tsx`.
- Navbar (desktop + More dropdown), mobile menu, and Footer link to `/news`; new `news.json` i18n namespace (en/vi) + `navbar_news`/`mobile_menu_news`/`footer_news` keys in `layout.json`.
- `routes/sitemap-articles.xml.ts`: static page URLs + published article URLs.
- Added `.prose-article` article-content typography styles to `app.css`.

### Backend additions this session
- `GET /api/storefront/articles/categories` — published articles grouped by category with counts (only categories with ≥1 published article). Added to `src/routes/storefront/articles.ts`.
- Contract tests added in `admin/articles.test.ts` (2 new tests: returns categories with counts, empty list when none).

## Deviations & Notes

- "Customize Now" per-article callout action was not added as a separate CTA — customization is embedded in the storefront product detail page, so the "View Product" action is the intended conversion path. Linked products render as callout cards with price.
- Admin articles client uses `backendFetch` (not Hono RPC) for POST/PATCH because request bodies are validated with manual `parseJson`/`parseParams`, which Hono RPC cannot type-infer. Recorded blocker per AGENTS.md exception rule.

## Verification Evidence

- Original session: `pnpm --filter backend test`: 302 passed (46 files); check/build clean; `pnpm --filter admin build` clean; `pnpm --filter router-cf typecheck/build` clean; `./init.sh` passes.
- Follow-up session: backend 308 tests passing; admin/router-cf checks and `./init.sh` rebuilt clean (see section above for the one-off flake note).

## Next Step

- Tasks 7.8–7.12 and 8.1–8.4 all done. Admin editor is now fully bilingual (VI/EN, per-field switch, EN optional with fallback), storefront passes the user's locale to all article/category endpoints, and the backend returns the correct translations at read time. The multilang wiring is complete.
- Change is complete and ready for review/archive (`openspec-archive-change`).
- Reminder: the `featured` column requires a schema push when the user runs `pnpm --filter backend db:generate` + `db:migrate:local` (per user preference, migrations are not authored in-repo).