# Session Handoff: storefront-admin-news

## Summary

The storefront-admin-news change is fully implemented and all Sections 1-6 of `tasks.md` are checked, plus follow-up hardening in Section 7 (2026-09-11): publish-date stamping, admin runtime fixes, featured/"Latest" rework, admin preview, **scheduled auto-publish (read-time status flip)**, and editor button/schedule cleanup. Section 8 (2026-09-13) completed the multilang wiring: the admin editor is now bilingual (VI/EN per-field switch) and the storefront passes the user's locale to all article/category endpoints. Section 9 (2026-09-14) fixed the blank left column on the article detail page (SSR TOC) and moved "News" to the top sidebar group. Baseline `./init.sh` passes (backend 322 tests).

## What Changed Last

Latest session (2026-09-14) — SSR TOC + admin nav placement:
- New `app/lib/article-toc.ts`: `scanTocFromHtml(html)` + `slugifyHeading` (same slugify/dedup rules as the old client pass). `news.$slug.tsx` loader now returns `tocEntries`; the `w-60 shrink-0` TOC column renders only when `tocEntries.length >= 2`, so short articles no longer leave a 240px blank column on xl screens.
- `StickyTableOfContents` takes `entries: TocEntry[]` from the loader; the hydration effect assigns heading IDs by index (matching SSR ids) and runs the IntersectionObserver highlight. Content remains SSR-rendered; no backend change.
- `sidebar-config.ts`: "News" moved from `operationsSidebarItems` to `primarySidebarItems` (below Products); `shellSections` re-ordered to match. Desktop + mobile both follow via `SidebarContent`.
- Task checkboxes 9.1–9.3 checked; progress.md and this file updated.

Earlier session (2026-09-13) — bilingual editor + storefront locale:
- `article-editor.tsx`: new `TranslationsState` (7 `LocalizedTextValue`) + 5 per-field `AdminLocale` states; `setTranslation` keeps canonical VI in sync; title/excerpt/featuredImageAlt/metaTitle/metaDescription use `LocalizedTextField` (`requiredLocales={["vi"]}`); counters follow the selected locale; `persist()` sends all 7 `*Translations`; `ArticleTipTapEditor` gets `key={id}` so switching articles remounts the editor.
- `article-tiptap-editor.tsx`: new props `valueByLocale` + `onChangeByLocale(locale, {html,json})`; header row with a `LanguageSwitch` (missing-locale underline); `useEditorLocaleSync` swaps content on locale change; `Placeholder` via `placeholderRef`. Parent uses functional `setTranslations` to avoid stale-closure content loss from the `onUpdate` callback captured at editor mount.
- Storefront `api.ts`: `fetchStorefrontArticles`/`fetchStorefrontArticle`/`fetchStorefrontArticleCategories` accept `locale` and append `?locale=`; `news.tsx`/`news.$slug.tsx` pass `getLocale(context)` to all three fetches (categories route already supported locale — no backend change).
- Task checkboxes 8.1–8.4 checked; progress.md and this file updated.

Earlier session (2026-09-11):
- `lib/article-publish.ts` (new): `flipDueScheduledArticles` + `markRowsPublished` — read-time auto-publish of due `scheduled` articles to `published`.
- Wired into storefront list + detail and admin list + detail (flips before DTO build, so responses + admin status badge show `published`).
- Kept `lib/article-schedule-publish.ts` cron as the deployed-prod batch flipper.
- Tests: storefront list flip, storefront detail flip, future-still-scheduled no-op, admin list flip — suite now 322 / 47 files.

## Key Decisions

1. Storefront article listing/detail are SSR loaders using `getBackendServiceFetch` (no client-only fetching).
2. TOC heading anchors: headings are now extracted **server-side** (`scanTocFromHtml`) so the sticky TOC column only renders when the article has ≥2 headings (no blank placeholder space on short articles); the client-side hydration effect assigns the same IDs by index and tracks the active section with an IntersectionObserver.
3. Featured = admin-pinned flag (`ORDER BY featured DESC, publishedAt DESC, id`); hero = newest `publishedAt`, tagged "Mới nhất".
4. Published articles get no in-admin button (viewable on web); drafts get "Preview".
5. Admin article client uses `backendFetch` (not Hono RPC) — manual `parseJson` bodies aren't RPC-inferable.
6. `featured` schema push is left to the user (`db:generate` + `db:migrate:local`); no migrations authored in-repo.
7. A scheduled article becomes public the moment `publishedAt <= now` and its DB status self-flips to `published` on the next read (storefront/admin list + detail) — works everywhere, including local dev where cron never fires. The `*/15 * * * *` cron (`lib/article-schedule-publish.ts`) remains only as the deployed-prod batch flipper. Picking a `publishedAt` is required to schedule (backend enforced).
8. **Bilingual localization model**: VI is the canonical/required locale; EN is optional and falls back to VI (`locValue[locale] || locValue.vi || locValue.en || ""`). Per-field `LanguageSwitch` (exactly like create-product/production-config). Counters count the currently-selected locale. Slug/status/dates/media URLs/SEO URLs/categories/products are NOT localized; category name/description are localized at the backend only (admin has no category CRUD UI).

## If You Resume

- All planned scope is complete (Sections 1-6, 7.1–7.12, 8.1–8.4, 9.1–9.3). Run `openspec-archive-change` to archive `openspec/changes/storefront-admin-news/` if the user is done with this change.
- Reminder UX QA: after `db:generate` + `db:migrate:local`, boot backend (8787) + admin (5174), then storefront (5173) and check `/news`, `/news/<slug>` (short article → no blank left column; long article → sticky TOC), the Preview modal, the Scheduled datetime picker, the per-field VI/EN switches in the editor (VI required underline, EN optional), and the News nav item in the top sidebar group.
- If more bilingual work arrives (e.g. a better long-form editing UX vs per-field switches), consider a global VI/EN toggle (option previously deferred).

## Verification

- `./init.sh` baseline passes (2026-09-11). Backend 322 tests, check, build clean; admin build clean; router-cf typecheck clean (2026-09-13: admin build + `router-cf typecheck` re-verified clean after the bilingual changes; backend untouched this session but re-checked clean).
- One-off flake observed previously (7 failures in `articles.test.ts`) in a single `./init.sh` run, not reproduced in later runs; suspected worker contention on the shared `getDb` mock.