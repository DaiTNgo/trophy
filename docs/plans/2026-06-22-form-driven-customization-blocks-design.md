# Form-Driven Customization Blocks Design

**Date:** 2026-06-22  
**Status:** Approved  
**Scope:** Admin-defined customization forms, shopper preview, and production values

## Goal

Replace direct shopper manipulation with a form-driven customizer. An administrator defines fixed
customization blocks for each product and zone. A shopper only enters text, selects preset artwork,
or uploads an allowed logo; the preview updates without exposing drag, resize, rotate, or crop tools.

## Model

A template contains physical `zones`. Each zone contains ordered `blocks`. A block defines both the
shopper-facing form control and its fixed production placement.

Supported block types:

- `text`: one-line input with `maxChars` and automatic font fitting.
- `textarea`: multi-line input with `maxChars` and `maxLines`.
- `media-select`: preset logo, background, border, or artwork choices.
- `media-upload`: an optional customer artwork upload with file and DPI rules.
- `color`, `select`, and `radio`: preset style values.
- `checkbox`: acknowledgements such as artwork rights and final design confirmation.

Every block has a stable ID, label, help text, required/default state, display order, optional
visibility condition, validation rules, and a fixed production slot. Renderable blocks additionally
define normalized placement, dimensions, rotation, z-index, font/style policy, and asset role.

## Preset Assets

`media-select` options reference immutable asset revisions. Each option has a label, thumbnail,
preview asset, production asset, and optional default flag. A block may expose a `none` option and
may be paired with a conditional `media-upload` block.

Changing a preset updates the preview immediately. Shoppers cannot alter preset placement. Existing
orders retain the selected asset revision even when an administrator later changes the catalogue.

## Shopper Flow

1. Select commerce variants such as trophy color or size.
2. Complete ordered customization blocks grouped by zone or step.
3. Preview updates from values using fixed block geometry.
4. Client validation reports character, line, required field, asset, and DPI errors.
5. Shopper reviews the final preview and confirms the design.
6. Backend validates the same template revision and values before checkout freezes the design.

The design document stores `blockId -> typed value`, selected immutable asset IDs, and resolved text
layout. It does not store shopper-authored transforms or browser canvas state.

## Text Rules

One-line blocks remove line breaks and fit the largest permitted production font size. Multi-line
blocks preserve up to `maxLines`, enforce `maxChars`, and fit each configured line box without
creating additional lines. Input is rejected when it cannot fit at the minimum font size.

## Admin Experience

The existing zone editor remains the place where operators define physical output surfaces. Within
each zone, a block editor creates and orders fields, configures defaults/options/conditions, and sets
fixed preview/production placement. Only administrators manipulate layout.

## Validation

Publication fails for duplicate block IDs, invalid defaults, missing preset assets, impossible slots,
or invalid conditional references. Checkout fails for missing required values, character or line
overflow, hidden-field injection, unavailable assets, low DPI, missing rights acknowledgement, or
missing final confirmation.

## Verification

- Contract tests for each block/value type, defaults, conditions, and invalid values.
- Text tests for character limits, newline handling, `maxLines`, and fitting failures.
- Storefront tests proving form edits update preview and preview nodes are not interactive.
- Backend tests proving client values cannot override geometry or use unapproved preset assets.
- SVG/PDF fixtures proving fixed blocks produce deterministic output.
