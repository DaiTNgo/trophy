## Backend scaffold

This app is set up as a Cloudflare Worker using:

- `Hono` for HTTP routing
- `Hono RPC` for type-safe client inference
- `Drizzle ORM` for database access
- `Cloudflare D1` as the SQLite database
- `Wrangler` for local dev, migrations, and deploys

Local Vite dev runs on `http://localhost:8787` and preview runs on `http://localhost:8788`.

## Commands

```txt
pnpm --filter backend dev
pnpm --filter backend build
pnpm --filter backend check
```

Generate Worker binding types if you want Wrangler-managed binding interfaces:

```txt
pnpm --filter backend cf-typegen
```

Generate and apply D1 migrations:

```txt
pnpm --filter backend db:generate
pnpm --filter backend db:migrate:local
pnpm --filter backend db:migrate:remote
```

Seed the first admin account in local development:

```txt
pnpm --filter backend seed:admin -- --username=admin
```

The seed helper posts to `/api/admin/bootstrap` and uses `trophy-local-bootstrap`
automatically on loopback URLs when `ADMIN_BOOTSTRAP_SECRET` is not set. The
admin UI now signs in with `username + password`, not email.

## D1 binding

Create a real D1 database, then replace the placeholder IDs in [`wrangler.jsonc`](/Users/dnt/workspace/trophy/apps/backend/wrangler.jsonc).

```txt
pnpm --filter backend exec wrangler d1 create backend
```

Staging and production D1 bindings are intentionally not declared yet. Add the
real environment-specific database IDs before deploying with `--env staging` or
`--env production`; Wrangler bindings are environment-specific.

## Customization asset storage

The `CUSTOMIZATION_ASSETS` R2 binding uses these buckets:

- local: `trophy-customization-assets-local`
- staging: `trophy-customization-assets-staging`
- production: `trophy-customization-assets-production`

Create the buckets before starting the corresponding environment. Image uploads
are private and are served through `/api/customizations/assets/:id/content`.

## Client type sharing

Client apps can infer API types directly from this backend package:

```ts
import { hc } from "hono/client";
import type { AppType } from "backend/client";

const client = hc<AppType>("http://localhost:8787");

const res = await client.api.samples.$post({
  json: {
    name: "First sample",
  },
});
```

`AppType` is exported from `apps/backend`, so the client does not need to redefine request or response types.
