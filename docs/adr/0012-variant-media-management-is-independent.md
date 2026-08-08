# Variant Media Management Is Independent

For a persisted Product Variant, Gallery Media and Customization Background are managed in a dedicated admin FocusModal, separate from Variant Details. Upload attaches an asset immediately, removal detaches and deletes it immediately, and Gallery Media order persists immediately after drag-and-drop; closing or cancelling Variant Details never rolls back completed media actions. This prevents a general detail-save failure from obscuring asset lifecycle and gives media its own explicit operator workflow.

New Gallery Media appends in selected-file order. Gallery Media has no manual reorder action.

Customization Background is a single replace-only slot. The admin validates candidate dimensions before requesting replacement, while the backend validates the uploaded bytes and sibling variant dimensions authoritatively before writing the replacement, updating its association, and deleting the old asset.

Product Media is only the thumbnail-selection surface. Operators choose a Variant Gallery Media or Customization Background asset, or upload one product-owned thumbnail asset, without duplicating an R2 object. Removing Variant Media or replacing Customization Background clears a matching thumbnail without selecting a fallback.

The media manager renders server-confirmed state. A failed upload, replace, reorder, or deletion leaves that state unchanged and exposes an inline retry action rather than optimistic destructive UI.

**Considered Options**

- Keep media inside the Variant Details modal and save it with the rest of the form: rejected because media has an independent, destructive asset lifecycle and its save semantics are misleading when mixed with price, stock, and attributes.
- Use a page-level media manager for all variants: rejected because the selected variant is the asset owner and the per-variant action is directly discoverable from the variants list.
