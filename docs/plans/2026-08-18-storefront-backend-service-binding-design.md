# Storefront Backend Service Binding

## Goal

Remove the public-network hop from server-rendered storefront requests to the
backend Worker and make the resulting latency observable in Cloudflare.

## Design

- The storefront Worker declares a `BACKEND` Service Binding targeting the
  existing `backend` Worker.
- The Worker entry passes Cloudflare `env` and `ctx` to React Router's request
  context. Storefront loaders derive a server-only fetch implementation from
  `context.cloudflare.env.BACKEND` and pass it to existing catalog API helpers.
- API helpers retain the current public backend URL and global `fetch` as their
  default. Browser-side uploads, assets, fonts, cart actions, and public API
  requests therefore retain their existing behavior.
- Backend Workers Logs are enabled at full sampling during this investigation,
  so the existing structured storefront and backend timing logs can be matched.

## Verification

- Run storefront typecheck, tests, and build.
- Deploy backend and storefront, then use `wrangler tail` and repeated curl
  measurements to verify that server-side API calls reach the backend through
  the Service Binding and reduce the public-hop latency.
