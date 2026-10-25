## Backend scaffold

This app is a Node.js server (`@hono/node-server`) using:

- `Hono` for HTTP routing
- `Hono RPC` for type-safe client inference
- `Drizzle ORM` with PostgreSQL
- A local filesystem volume for object storage (`src/lib/storage.ts`)

Local dev runs on `http://localhost:8787`.

## Commands

```txt
pnpm --filter backend dev
pnpm --filter backend build
pnpm --filter backend check
```

Generate and apply database migrations (requires `DATABASE_URL`):

```txt
pnpm --filter backend db:generate
pnpm --filter backend db:migrate
```

## First admin

Create the first super-admin account via the admin UI at `/onboarding`. Alternatively, POST to the bootstrap endpoint directly:

```txt
curl -X POST http://localhost:8787/api/admin/bootstrap \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"admin1234"}'
```

The admin UI signs in with `username + password`, not email.

## MISA integration

Set `MISA_CLIENT_ID`, `MISA_CLIENT_SECRET` and `MISA_API_BASE_URL` in the root `.env` (see `.env.example`). Do not commit real MISA secrets.

MISA publish and checkout flows call the backend MISA client directly. The admin proxy at `/api/admin/misa/products` is intended for authenticated debugging and lookup; it never returns the MISA bearer token.

Before applying the migration, the schema requires `product_variants.misa_product_id`, `misa_sync_status`, `misa_last_error`, and `misa_synced_at` for per-variant MISA synchronization, plus the order MISA sync fields defined in `src/db/schema.ts`. Migration generation and application are intentionally operator-owned for this change.

Useful Bruno requests after checkout or while debugging:

```http
POST {{backend_url}}/api/storefront/orders
Content-Type: application/json

{{checkout_payload}}
```

```http
GET {{backend_url}}/api/admin/misa/products?q=SKU-1
Authorization: Bearer {{admin_session_token}}
```

```http
POST {{backend_url}}/api/admin/products/{{product_id}}/publish
Authorization: Bearer {{admin_session_token}}
```

The publish request is the business flow: Admin calls Trophy and the backend calls MISA directly. The MISA proxy is only for explicit admin lookup/debug operations.

## Customization asset storage

Uploaded assets are stored under `STORAGE_DIR` (default `./storage`). Image uploads
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
