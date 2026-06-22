# Custom Template Listing And Selection

## Overview

Connect the admin template editor to the backend API, add a listing endpoint for published templates, and let storefront shoppers browse and select a template to customize.

## Architecture

### Backend changes (`apps/backend/src/routes/customizations.ts`)

1. **`GET /templates`** — list published templates
   - Filters `customizationTemplates.status = 'published'` and `activeRevisionId IS NOT NULL`
   - Joins with `products` to include `productTitle` and `productHandle`
   - Returns array of: `id`, `productId`, `productTitle`, `productHandle`, `name`, `previewUrl`, `revision`, `zoneCount`, `createdAt`

2. **`GET /templates/:id`** — get a single template by ID

3. **`GET /templates/product/:productId`** — existing, update to accept `?draft=1` to allow admin to see draft template, default returns published

### Admin changes (`apps/admin/src/`)

1. **Template listing on `/customization-templates`**
   - Fetch templates from `GET /api/customizations/templates`
   - Display as card grid with product info, template name, preview, status
   - "Create template" / "Edit" buttons linking to editor

2. **Editor page on `/customization-templates/edit?productId=X`**
   - Loads existing template from backend via `GET /templates/product/:productId?draft=1`
   - "Save draft" → `POST /api/customizations/templates`
   - "Publish revision" → save then `POST /templates/:id/publish`
   - Remove localStorage persistence

### Storefront changes (`apps/storefront/app/`)

1. **Route updates** (`routes.ts`)
   - `/customize` — template listing
   - `/customize/:templateId` — template detail/customizer

2. **Template listing page** (`routes/customize.tsx`)
   - Fetch from `GET /api/customizations/templates`
   - Card grid: preview image, template name, product name, zone count
   - Card click → navigate to `/customize/:templateId`

3. **Customize page** (`routes/customize.$templateId.tsx`)
   - Load template from `GET /api/customizations/templates/:id`
   - Pass to updated `CupCustomizer`

4. **CupCustomizer update**
   - Accept `template` prop, fallback to `DEFAULT_TEMPLATE` for backward compat
   - Remove hardcoded `DEFAULT_TEMPLATE`
   - Backend URL already via `VITE_BACKEND_URL`

## Data Flow

```
Admin Editor → POST /api/customizations/templates → D1
Admin Publish → POST /api/customizations/templates/:id/publish → D1
Storefront → GET /api/customizations/templates → List published templates
Storefront → GET /api/customizations/templates/:id → Full template detail
```
