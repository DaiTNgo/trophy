# Storefront Not Found Page Design

## Goal

Replace the storefront's nearly blank 404 response with a branded, localized not-found page that keeps the existing storefront shell and gives shoppers clear recovery paths.

## Approved approach

Move the catch-all route into the existing `storefront-layout` route group. This lets unmatched storefront URLs render through the real TrustBar, Navbar, Footer, and ContactButtons without duplicating layout code. The catch-all loader will continue returning an explicit HTTP 404 response.

## User experience

- Render a centered 404 section between the existing header and footer on a white surface.
- Use the existing Barlow Condensed display font for the large `404` marker and heading; use Inter for supporting copy and controls.
- Provide a primary blue action linking to the localized home path and a secondary outlined action linking to the products page.
- Keep the composition responsive: stacked actions on small screens and an inline action row on larger screens.
- Provide Vietnamese and English strings through the existing `common.json` locale files and `useTranslation`.

## Error and routing behavior

- The catch-all loader returns `data(null, { status: 404 })`.
- Existing concrete routes, checkout, and API locale routes keep their current ordering and behavior.
- No backend, data model, or compatibility path changes are needed.

## Verification

- Run the storefront typecheck and production build.
- Run storefront tests if route or translation contracts require them.
- Verify the diff has no whitespace errors and manually confirm that a missing storefront URL shows the shell and both recovery links.
