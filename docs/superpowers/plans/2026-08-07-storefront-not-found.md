# Storefront Not Found Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the storefront's blank-looking missing-route response with a localized branded 404 page rendered inside the existing storefront shell.

**Architecture:** Move the existing catch-all route into the `storefront-layout` route group so the shared TrustBar, Navbar, Footer, and ContactButtons render for unmatched storefront URLs. Keep the catch-all loader's explicit 404 status and make the page component use the existing i18n and link conventions.

**Tech Stack:** React Router framework routes, React, react-i18next, Tailwind CSS v4, Vitest, Cloudflare Worker build.

## Global Constraints

- Storefront changes stay under `apps/storefront` except for the committed design and plan documents.
- Use the existing storefront layout, design tokens, typography, and `Link`/button patterns; do not add dependencies.
- Keep the response status `404` from the catch-all loader.
- Add English and Vietnamese copy through the existing locale files.
- Verify with storefront typecheck, build, and `git diff --check`.

---

### Task 1: Route the catch-all through the storefront shell

**Files:**
- Modify: `apps/storefront/app/routes.ts`
- Modify: `apps/storefront/app/routes/catchall.tsx`
- Modify: `apps/storefront/app/locales/en/common.json`
- Modify: `apps/storefront/app/locales/vi/common.json`

**Interfaces:**
- Consumes: the existing `storefront-layout` route and `useTranslation` i18n setup.
- Produces: a `404` response whose rendered page includes the shared storefront shell, localized 404 content, and recovery links to `/` and `/products`.

- [x] **Step 1: Inspect existing localized common copy and link/button patterns**

Run:

```bash
sed -n '1,220p' apps/storefront/app/locales/en/common.json
sed -n '1,220p' apps/storefront/app/locales/vi/common.json
rg -n "<Link|action-support|Button" apps/storefront/app/routes apps/storefront/app/components | head -80
```

Expected: reuse existing namespaces and classes instead of introducing a new UI dependency or translation system.

- [x] **Step 2: Update the route tree so the catch-all is inside `storefront-layout`**

In `apps/storefront/app/routes.ts`, append:

```ts
route("*", "routes/catchall.tsx"),
```

inside the `layout("components/layout/storefront-layout.tsx", [...])` children, after the concrete storefront routes. Remove the top-level catch-all route so checkout and API routes remain outside the storefront shell.

- [x] **Step 3: Keep the 404 loader and build the localized page**

In `apps/storefront/app/routes/catchall.tsx`, retain:

```ts
export async function loader() {
  return data(null, { status: 404 });
}
```

Use `useTranslation("common")` and `Link` from `react-router`. Render a responsive centered section with:

```tsx
<main className="flex min-h-[min(70vh,42rem)] items-center justify-center bg-surface-base px-4 py-16 sm:px-6 lg:px-8">
  <div className="mx-auto max-w-2xl text-center">
    <p className="font-heading text-display-lg-mobile font-semibold tracking-[0.08em] text-brand-support sm:text-display-xl">
      404
    </p>
    <h1 className="mt-2 font-heading text-headline-lg font-semibold text-brand-strong sm:text-display-md">
      {t("notFound.title")}
    </h1>
    <p className="mx-auto mt-4 max-w-xl text-body-lg text-text-muted">
      {t("notFound.description")}
    </p>
    <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
      <Link to="/" className="...existing supportive action classes...">
        {t("notFound.homeAction")}
      </Link>
      <Link to="/products" className="...existing outlined action classes...">
        {t("notFound.productsAction")}
      </Link>
    </div>
  </div>
</main>
```

Use the exact existing action class combinations found during Step 1, with visible focus states and no hard-coded language-specific text in the component.

- [x] **Step 4: Add the English and Vietnamese strings**

Add a `notFound` object to both `common.json` files with these meanings:

```json
{
  "notFound": {
    "title": "The page you're looking for doesn't exist.",
    "description": "The link may be outdated or the page may have moved. Let's get you back to something worth celebrating.",
    "homeAction": "Back to home",
    "productsAction": "Browse products"
  }
}
```

Use natural Vietnamese equivalents in `vi/common.json`, preserving the same keys and JSON shape.

- [x] **Step 5: Run focused verification**

Run:

```bash
pnpm --filter router-cf typecheck
pnpm --filter router-cf build
git diff --check
```

Expected: all commands pass; the generated route types accept the nested catch-all route; the build completes with the storefront shell and localized 404 page. Also verified with `pnpm --filter router-cf test` (7 files, 26 tests) and a live dev-server request to `/this-page-does-not-exist` returning HTTP 404 with shell and CTA markup.

- [x] **Step 6: Inspect the final diff and commit the implementation**

Run:

```bash
git diff -- apps/storefront/app/routes.ts apps/storefront/app/routes/catchall.tsx apps/storefront/app/locales/en/common.json apps/storefront/app/locales/vi/common.json
git status --short
git add apps/storefront/app/routes.ts apps/storefront/app/routes/catchall.tsx apps/storefront/app/locales/en/common.json apps/storefront/app/locales/vi/common.json
git commit -m "feat: add storefront not-found page"
```

Expected: only the requested route, page, and locale files are included in the implementation commit; the working tree has no uncommitted implementation changes.
