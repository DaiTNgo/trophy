# Session Handoff: storefront-admin-news

## Summary

The storefront-admin-news change is fully implemented and all Sections 1-6 of `tasks.md` are checked, plus follow-up hardening in Section 7 (2026-09-11): publish-date stamping, admin runtime fixes, featured/"Latest" rework, admin preview, **scheduled auto-publish**, and editor button/schedule cleanup. Baseline `./init.sh` passes (backend 317 tests).

## What Changed Last

Latest session (2026-09-11):
- `lib/article-schedule-publish.ts` (new): cron job flips due `scheduled` articles to `published` (idempotent batch); wired into `src/index.ts` `scheduled` handler.
- `admin/articles.ts` (backend): rejects `status: "scheduled"` without `publishedAt` on create AND PATCH (400 "A publish date is required...").
- `article-editor.tsx` (admin): Preview button always visible; modal badge reflects current `form.status`; buttons reduced to single **Save** (persists selected status) + **Delete**; `datetime-local` picker shown when `Status = Scheduled`, bound to `publishedAt`.
- Tests: `lib/article-schedule-publish.test.ts` (2), PATCH scheduled-without-date contract test (1) — suite now 317 / 47 files.

## Key Decisions

1. Storefront article listing/detail are SSR loaders using `getBackendServiceFetch` (no client-only fetching).
2. TOC generates heading anchor IDs client-side from the rendered `.prose-article` HTML (contentHtml has no IDs).
3. Featured = admin-pinned flag (`ORDER BY featured DESC, publishedAt DESC, id`); hero = newest `publishedAt`, tagged "Mới nhất".
4. Published articles get no in-admin button (viewable on web); drafts get "Preview".
5. Admin article client uses `backendFetch` (not Hono RPC) — manual `parseJson` bodies aren't RPC-inferable.
6. `featured` schema push is left to the user (`db:generate` + `db:migrate:local`); no migrations authored in-repo.
7. Auto-publish relies on the existing `*/15 * * * *` cron; an article is hidden on storefront until cron flips `scheduled` → `published`. Picking a `publishedAt` is required to schedule (backend enforced).

## If You Resume

- **Remaining known scope (from earlier multilang plan, NOT part of tasks 7.x)**: admin editor does not yet submit `*Translations` (vi/en) and storefront news routes do not yet pass `?locale=` — backend routes/DTOs and `articles-client.ts` types are already done. Resume there if the user asks to continue multilang.
- Otherwise the change is complete; run `openspec-archive-change` to archive `openspec/changes/storefront-admin-news/`.
- Reminder UX QA: after `db:generate` + `db:migrate:local`, boot backend (8787) + admin (5174), then storefront (5173) and check `/news`, `/news/<slug>`, the Preview modal, and the Scheduled datetime picker.

## Verification

- `./init.sh` baseline passes (2026-09-11). Backend 317 tests, check, build clean; admin build clean; router-cf typecheck clean (storefront unchanged this session).
- One-off flake observed previously (7 failures in `articles.test.ts`) in a single `./init.sh` run, not reproduced in later runs; suspected worker contention on the shared `getDb` mock.