# Variant-Owned Customization Media

Each variant of a published customizable product owns exactly one independently uploaded Customization Media asset, used as that variant's canvas in the customization editor and storefront preview. Drafts may remain incomplete until publish readiness. Gallery Media remains a separate, shopper-facing reference gallery and is neither used as a canvas nor constrained to canvas dimensions; this replaces the background-derivation consequence in ADR 0001 because it lets operators curate product examples without affecting customization geometry.

In the current development environment, existing products do not retain a Gallery Media fallback. They need Customization Media before they can pass customization readiness or use a customization editor.

For shopper-facing imagery, a variant's Customization Media may be used as a display fallback only when that variant has no Gallery Media; it is not added to the managed Gallery Media collection.

**Considered Options**

- Select one Gallery Media item as the customization canvas: rejected because gallery curation and canvas preparation are separate jobs, and reference images may intentionally have different dimensions.
- Treat every Gallery Media item as a possible canvas: rejected because it makes gallery uploads unexpectedly constrain customization readiness and layer geometry.
