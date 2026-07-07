# Customization owns clipart

Clipart is part of the shopper customization model, not brand identity management. Admin navigation and domain language should treat clipart as a child of Customization, and Brand Assets should move under Customization for colors and fonts rather than remaining a top-level admin domain.

Clipart categories are explicit entities that own clipart assets. Clipart assets belong to exactly one category, can be SVG icons or raster images, do not use tags, and category/asset lifecycle should use deactivation instead of hard deletion when existing templates or order snapshots may depend on them.

The admin routes should migrate directly to the new Customization hierarchy without legacy redirects: `/customization/templates`, `/customization/clipart`, and `/customization/brand-assets`.

Clipart categories carry ordering for admin browsing. Clipart assets do not need global manual ordering initially; any shopper-facing order can belong to the layer allowlist if that becomes necessary.
