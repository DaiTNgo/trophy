# AGENTS.md

Repository harness for reliable agent-assisted development in this ecommerce monorepo.

<!--VITE PLUS START-->

# Using Vite+, the Unified Toolchain for the Web

This project is using Vite+, a unified toolchain built on top of Vite, Rolldown, Vitest, tsdown, Oxlint, Oxfmt, and Vite Task. Vite+ wraps runtime management, package management, and frontend tooling in a single global CLI called `vp`. Vite+ is distinct from Vite, and it invokes Vite through `vp dev` and `vp build`. Run `vp help` to print a list of commands and `vp <command> --help` for information about a specific command.

Docs are local at `node_modules/vite-plus/docs` or online at https://viteplus.dev/guide/.

## Review Checklist

- [ ] Run `vp install` after pulling remote changes and before getting started.
- [ ] Run `vp check` and `vp test` to format, lint, type check and test changes.
- [ ] Check if there are `vite.config.ts` tasks or `package.json` scripts necessary for validation, run via `vp run <script>`.
- [ ] If setup, runtime, or package-manager behavior looks wrong, run `vp env doctor` and include its output when asking for help.

<!--VITE PLUS END-->

## Startup Workflow

Before writing code:

1. Confirm the working directory with `pwd` and ensure it is the repo root.
2. Read this file completely.
3. Read `README.md` plus the app-specific files you will touch.
4. Run `./init.sh` from the repo root.
5. Read `feature_list.json` to identify the single active feature.
6. Read `progress.md` and `session-handoff.md` if present.
7. Review recent changes with `git log --oneline -5`.

If baseline verification is failing, repair that first before adding new scope.

## Repo Map

- `apps/backend`: Hono API intended to run on Cloudflare Workers. Current state is minimal scaffold with Wrangler and Vite integration.
- `apps/admin`: React admin app using Vite+ today. The target UI architecture is React with React Router.
- `apps/storefront`: React Router framework storefront running on Cloudflare Workers.
- `openspec`: product or spec material if the team adopts spec-driven changes.

Planned stack for this repository is:

- Backend API: Hono
- Database access: Drizzle
- Database/runtime: Cloudflare D1
- Admin frontend: React + React Router
- Storefront frontend: React Router framework on Cloudflare

Treat Drizzle and D1 as intended architecture unless the relevant packages, schema, migrations, and bindings already exist in the files you are editing.

## Working Rules

- One feature at a time: pick exactly one unfinished item from `feature_list.json`.
- Stay in scope: do not refactor unrelated apps while working on one feature.
- Match current reality first: do not document Drizzle, D1, auth, or shared packages as implemented unless the code actually exists.
- Preserve app boundaries:
  - `backend` owns API routes, business logic entrypoints, and Cloudflare bindings.
  - `admin` owns internal operator flows and should not depend on storefront route code.
  - `storefront` owns shopper-facing routes, loaders, actions, and SSR behavior.
- Prefer incremental architecture:
  - Add Hono routes before broad abstractions.
  - Add Drizzle schema and migrations before repository layers.
  - Add shared contracts only when at least two apps actually use them.
- Verification required: do not claim done without running the relevant checks.
- Update artifacts: before ending a session, update `progress.md` and `feature_list.json`.
- Leave a restartable repo: the next session should be able to run `./init.sh` cleanly.

## Required Artifacts

- `feature_list.json`: source of truth for feature status and evidence.
- `progress.md`: current session state, blockers, and verification notes.
- `init.sh`: standard verification entrypoint from repo root.
- `session-handoff.md`: concise restart notes for the next session.

## Definition of Done

A feature is done only when all of the following are true:

- [ ] Target behavior is implemented in the correct app.
- [ ] Relevant verification actually ran.
- [ ] Evidence is recorded in `feature_list.json`, `progress.md`, or `session-handoff.md`.
- [ ] Any required docs or config changes were updated.
- [ ] The repository remains restartable from `./init.sh`.

## Verification Commands

Run from the repo root.

```bash
./init.sh
```

`./init.sh` currently runs these checks:

- `pnpm install`
- `pnpm --filter backend build`
- `pnpm --filter admin build`
- `pnpm --filter router-cf typecheck`
- `pnpm --filter router-cf build`

There is no root-level automated test suite yet. When implementing a feature, add the most local automated check available and record manual verification evidence when tests do not yet exist.

## Editing Guidance

- For new API work, start in `apps/backend/src`.
- For new admin routes or screens, add React Router structure instead of growing a single `App.tsx`.
- For storefront work, prefer route loaders/actions and server-aware data flow over client-only fetching.
- Keep Cloudflare configuration changes aligned with the app they belong to:
  - `apps/backend/wrangler.jsonc`
  - `apps/storefront/wrangler.jsonc`
- If adding D1:
  - declare bindings in Wrangler config,
  - add Drizzle config and migration flow,
  - record exact verification commands for schema generation or migration.

## End of Session

Before ending a session:

1. Update `progress.md` with current state and next step.
2. Update `feature_list.json` status and evidence.
3. Record blockers, risks, and any assumptions that were left open.
4. Update `session-handoff.md` if the work spans sessions.
5. Leave the repo clean enough for the next session to start from `./init.sh`.

## Escalation

Ask the user before proceeding when:

- a change requires inventing business rules not present in code or docs,
- a schema or API contract change affects more than one app,
- Cloudflare bindings, secrets, or D1 environments are ambiguous,
- verification fails for reasons unrelated to the active feature,
- an instruction conflicts with the actual repository state.
