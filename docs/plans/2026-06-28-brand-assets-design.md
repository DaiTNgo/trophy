# Brand Assets Management Design

## 1. Overview
The Trophy Customization system currently hardcodes font choices and default colors inside the `constants.ts` file. This prevents administrators from easily adding new brand assets without developer intervention. This feature introduces a dynamic **Brand Assets** management system inside the Admin application.

## 2. Goals
- Allow Admins to upload and manage Font Families (`.ttf` files for Regular, Bold, Italic, and Bold-Italic variants).
- Allow Admins to define a global palette of Default Colors.
- Remove hardcoded fonts/colors from the frontend apps and load them dynamically from the backend.
- Ensure the PDF export engine fetches the correct `.ttf` files from the new system.

## 3. Database Architecture (Cloudflare D1)

We will introduce two new tables:

### `brand_colors`
- `id`: TEXT PRIMARY KEY
- `name`: TEXT NOT NULL (e.g. "Gold")
- `hex_code`: TEXT NOT NULL (e.g. "#b45309")
- `created_at`: INTEGER NOT NULL

### `font_families`
- `id`: TEXT PRIMARY KEY
- `name`: TEXT NOT NULL (e.g. "Roboto")
- `regular_asset_id`: TEXT NULL (Reference to R2 asset)
- `bold_asset_id`: TEXT NULL
- `italic_asset_id`: TEXT NULL
- `bold_italic_asset_id`: TEXT NULL
- `created_at`: INTEGER NOT NULL

## 4. Storage Architecture (Cloudflare R2)
- TTF font files will be uploaded directly to Cloudflare R2 using presigned URLs.
- R2 objects will be served via the backend API or directly via a public bucket URL.

## 5. UI Layout (Admin)
- A new **"Brand Assets"** item will be added to the main Admin sidebar.
- The view will contain two main tabs/sections: **Colors** and **Fonts**.
- **Colors Tab**: Displays a grid of current colors with a visual swatch. Includes an "Add Color" form.
- **Fonts Tab**: Displays a list of Font Families. Includes an "Add Font Family" form where the user enters the Name and can upload up to 4 TTF files.

## 6. Integration Points
- **Apps/Admin**: The Customization Template Editor must fetch the list of `brand_colors` and `font_families` on load.
- **Apps/Storefront**: The Shopper UI must also fetch these assets to populate its pickers.
- **Backend (Render Engine)**: The `pdf-export.ts` logic will need to download TTF fonts from the R2 URLs associated with the `font_families` table rather than the static `public/fonts` directory.
