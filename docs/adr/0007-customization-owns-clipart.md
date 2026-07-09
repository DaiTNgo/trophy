# Customization owns clipart

Clipart is part of the shopper customization model, not brand identity management. Admin navigation and domain language should treat clipart as a child of Customization, and Brand Assets should move under Customization for colors and fonts rather than remaining a top-level admin domain.

Clipart categories are explicit entities that own clipart assets. Clipart assets belong to exactly one category, can be SVG, PNG, or WebP media, do not use tags, and category/asset lifecycle should use deactivation instead of hard deletion when existing templates or order snapshots may depend on them. Each asset keeps the original file name plus a separate display name used for admin labels, shopper hover tooltips, accessible labels, and order snapshots.

The admin routes should migrate directly to the new Customization hierarchy without legacy redirects: `/customization/templates`, `/customization/clipart`, and `/customization/brand-assets`.

Clipart categories carry ordering for admin browsing. Clipart assets do not need global manual ordering initially; any shopper-facing order can belong to the layer allowlist if that becomes necessary.

The customization model should not include a fixed single-asset clipart mode. Clipart category layers let admins choose one Clipart Category, curate an allowlist, choose a required default asset, and let shoppers choose from that curated list. Upload-or-clipart layers also default to the selected clipart asset; shoppers may switch to upload, and the form may retain the temporary upload state, but cart and order snapshots use only the currently selected source/value.

The remaining source policies are upload-only, clipart-category-only, and upload-or-clipart-category. Upload-or-clipart keeps both source-select and side-by-side presentations, with clipart as the default source in either presentation. Deactivated categories and invalid default assets make publish readiness fail for products/templates that still reference them, while existing order snapshots remain reproducible.

Order snapshots for clipart choices keep the selected asset identity, display name, category id, source asset reference, URL, MIME type, dimensions, and rendered layer context. They do not need to keep the source file name or category display name.
