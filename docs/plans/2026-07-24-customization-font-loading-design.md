# Customization Font Loading Design

## Goal

Render the font selected in storefront product customization correctly, avoid misleading shopper controls, and reuse an uploaded font in the browser across product-detail navigations.

## Current Issue

The shared preview resolves a selected dynamic font family to a concrete font asset ID before rendering. Its font loader then tries to find that asset ID as though it were a family ID, so it does not emit the matching `@font-face` rule. The preview falls back to a browser default font.

## Runtime Font Resolution

Introduce shared helpers that:

- determine which configured font families are usable;
- expose the real bold and italic capabilities of a selected family; and
- resolve a family plus requested bold/italic state to an existing asset ID.

For dynamic fonts, regular is required for a family to be usable. A missing bold, italic, or bold-italic asset is not synthesized. The resolver uses regular only as a defensive rendering fallback for persisted legacy values; the shopper form does not expose a missing variant as a choice.

The shared `FontLoader` receives runtime text layers whose `fontId` is already an asset ID. It will register one `@font-face` per used asset ID, using that same ID as `font-family` and `resolveFontUrl(assetId)` as the source. Static font behavior remains unchanged.

## Shopper Experience

The shared form filters the template's shopper-selectable font options to usable families.

- Fewer than two usable families: select the sole valid family as the effective value and hide the Font control.
- Two or more usable families: render the Font control with only valid options.
- When `formatPolicy` is shopper-selectable, render `B` only if the active family has a bold asset and `I` only if it has an italic asset.
- Changing font family clears bold/italic values that the new family does not support.
- A regular-only family therefore presents neither `B` nor `I`; regular-plus-bold presents only `B`; regular-plus-italic presents only `I`.

## Admin Experience

The text-layer inspector derives styling capability from the families allowed by its font policy.

If no allowed usable family exposes bold or italic, it hides the format-policy mode (`Fixed` / `Shopper selectable`) and the format defaults. The stored configuration is normalized to regular. Font-family policy remains independent: it is still shown when the admin can choose among two or more families.

## Browser Cache

Font uploads have immutable asset IDs, and font file URLs include that ID. The storefront font-file response will return:

```http
Cache-Control: private, max-age=31536000, immutable
```

This makes the browser reuse the downloaded Inter asset when product A and product B reference the same asset ID, without relying on a shared CDN cache. Replacing a font uploads a new asset ID, therefore producing a new URL and a fresh browser download.

## Verification

Add focused tests for:

- dynamic asset resolution and missing-variant fallback;
- filtering unusable font families;
- per-family B/I visibility and normalization after a family change;
- admin format-policy suppression when no selected family has a style variant; and
- the storefront font-file cache header.

Run customization shared-package checks, backend tests/check/build for the changed font endpoint, admin build, storefront typecheck/build, and `./init.sh` before completion.
