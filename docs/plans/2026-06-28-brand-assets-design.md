# Brand Assets Management Design

## 1. Overview
The Trophy Customization system currently hardcodes font choices and default colors inside the `constants.ts` file. This prevents administrators from easily adding new brand assets without developer intervention. This feature introduces a dynamic **Brand Assets** management system inside the Admin application.

## 2. Goals
- Allow Admins to upload and manage Font Families (`.ttf` files for Regular, Bold, Italic, and Bold-Italic variants).
- Allow Admins to define a global palette of Default Colors.
- Allow Admins to upload and manage reusable customization icon assets that shoppers can select from product-specific allowlists.
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

### `customization_icon_assets`
- `id`: TEXT PRIMARY KEY
- `name`: TEXT NOT NULL (e.g. "Soccer Ball")
- `category`: TEXT NULL (e.g. "Sports", "Awards", "Frames")
- `tags_json`: TEXT NOT NULL DEFAULT `[]`
- `asset_id`: TEXT NOT NULL (Reference to R2 asset)
- `preview_url`: TEXT NOT NULL
- `mime_type`: TEXT NOT NULL
- `width_px`: INTEGER NULL
- `height_px`: INTEGER NULL
- `active`: INTEGER NOT NULL DEFAULT 1
- `created_at`: INTEGER NOT NULL

## 4. Storage Architecture (Cloudflare R2)
- TTF font files will be uploaded directly to Cloudflare R2 using presigned URLs.
- Customization icon files will be uploaded to R2 and stored as reusable brand/customization assets. SVG should be preferred for production-safe vector output; PNG/WebP can be allowed for raster icons when needed.
- R2 objects will be served via the backend API or directly via a public bucket URL.

## 5. UI Layout (Admin)
- A new **"Brand Assets"** item will be added to the main Admin sidebar.
- The view will contain three main tabs/sections: **Colors**, **Fonts**, and **Icons**.
- **Colors Tab**: Displays a grid of current colors with a visual swatch. Includes an "Add Color" form.
- **Fonts Tab**: Displays a list of Font Families. Includes an "Add Font Family" form where the user enters the Name and can upload up to 4 TTF files.
- **Icons Tab**: Displays an approved icon/clip-art library with thumbnail, name, category, tags, file type, active state, and delete/archive actions. Includes an "Add Icon" form for uploading SVG/PNG/WebP assets and assigning category/tags.

## 6. Product Customization Integration

Admin-managed icons are global assets, but shoppers should only see icons explicitly allowed for the current product/layer.

For each image/icon-capable customization layer, the admin should choose the shopper source policy:

- **Upload only:** shopper uploads their own logo/image.
- **Icon library only:** shopper chooses from the admin-approved icon list.
- **Upload or icon library:** shopper may either upload an image or choose an approved icon.

When the admin chooses icon-library behavior, the product editor must support selecting an allowlist of icon assets for that layer. This prevents a generic global icon list from leaking irrelevant choices into a specific product, such as showing football icons on a corporate plaque.

The shopper runtime should render the selected icon through the same fixed layer geometry and crop/fit rules used for image shape layers. The shopper may select the icon, but may not change the icon layer's position, size, rotation, or shape.

## 7. Integration Points
- **Apps/Admin**: The Customization Template Editor must fetch the list of `brand_colors` and `font_families` on load.
- **Apps/Admin**: The Brand Assets page must manage icon assets, and the Product Customization editor must let admins attach an icon allowlist to eligible image/icon layers.
- **Apps/Storefront**: The Shopper UI must also fetch these assets to populate its pickers.
- **Apps/Storefront**: Icon choice fields must show only the product/layer allowlist, not the entire global icon library.
- **Backend (Render Engine)**: The `pdf-export.ts` logic will need to download TTF fonts from the R2 URLs associated with the `font_families` table rather than the static `public/fonts` directory.
- **Backend (Render Engine)**: Production export must embed the selected icon asset from the order customization snapshot. SVG icons should remain vector where supported; raster icons should preserve original resolution.
- **Orders**: The order customization snapshot must capture selected icon asset ID, name, source asset metadata, and the rendered layer result so later admin asset edits do not change an existing order.
