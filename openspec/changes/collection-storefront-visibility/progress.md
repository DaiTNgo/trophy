# Progress

## Status

Implementation complete for `collection-storefront-visibility`.

- Collection schema, admin CRUD contracts, and public-default serialization are implemented.
- Admin create, list, detail, and edit surfaces expose `Public` and `Hidden`.
- Storefront collection discovery and direct collection product resolution exclude hidden collections; missing or hidden collection routes return `404`.
- Collection-product assignments and product publication state are unchanged by visibility updates.
- The existing admin product-name link remains `/products/:id`; row action menus remain separate.
- Collection detail product names now also link to `/products/:id` without making the entire row clickable.

## Verification

- `./init.sh` passed: backend check, 146 backend tests, backend build, admin build, and storefront type generation/typecheck.
- `pnpm --filter router-cf build` passed.
- `git diff --check` passed.
- Admin collection detail link verification: `pnpm --filter admin build` passed.

## Assumptions

- The current dev schema is updated directly; no migration artifact was added per the change requirements.
- Existing nullable/legacy visibility values are treated as `public` in serialized responses and storefront filters.
