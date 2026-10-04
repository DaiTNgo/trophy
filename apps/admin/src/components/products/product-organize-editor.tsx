import { Label, Text } from "@medusajs/ui";
import type { ReactNode } from "react";
import { CategoryMultiSelect } from "../ui/medusa/category-multiselect";
import type { ProductMetadataItem } from "../../lib/product-metadata-client";

type ProductOrganizeEditorProps = {
  collections: ProductMetadataItem[];
  categories: ProductMetadataItem[];
  selectedCollectionIds: string[];
  onChangeCollectionIds: (ids: string[]) => void;
  selectedCategoryIds: string[];
  onChangeCategoryIds: (ids: string[]) => void;
  isLoading?: boolean;
  isCustomizationEnabled?: boolean;
};

export function OptionalFormLabel({ children }: { children: ReactNode }) {
  return (
    <Label className="flex items-center gap-x-1">
      {children}
      <Text as="span" size="small" className="text-ui-fg-muted">
        (Optional)
      </Text>
    </Label>
  );
}

export function LoadingPlaceholder() {
  return (
    <div className="rounded-md border border-ui-border-base bg-ui-bg-base px-3 py-2 text-sm text-ui-fg-muted">
      Loading…
    </div>
  );
}

export function ProductOrganizeEditor({
  collections,
  categories,
  selectedCollectionIds,
  onChangeCollectionIds,
  selectedCategoryIds,
  onChangeCategoryIds,
  isLoading = false,
  isCustomizationEnabled = false,
}: ProductOrganizeEditorProps) {
  return (
    <>
      <div className="space-y-2">
        <OptionalFormLabel>Collections (Shop by Interest)</OptionalFormLabel>
        <Text size="xsmall" className="text-ui-fg-muted">
          Merchandising grouping (e.g. occasion or audience).
        </Text>
        {isLoading ? (
          <LoadingPlaceholder />
        ) : (
          <CategoryMultiSelect
            values={selectedCollectionIds}
            options={collections.map((col) => ({
              value: String(col.id),
              label: col.label,
            }))}
            onChange={onChangeCollectionIds}
            placeholder="Select collections"
            searchPlaceholder="Search collections..."
            emptyText="No collections found"
          />
        )}
      </div>

      <div className="space-y-2 mt-5">
        <OptionalFormLabel>Categories (Shop by Product)</OptionalFormLabel>
        <Text size="xsmall" className="text-ui-fg-muted">
          Shopper-facing product-kind placement. A product may belong to
          multiple categories.
        </Text>
        {isLoading ? (
          <LoadingPlaceholder />
        ) : (
          <CategoryMultiSelect
            values={selectedCategoryIds}
            options={categories.map((cat) => ({
              value: String(cat.id),
              label: cat.label,
              locked: Boolean(isCustomizationEnabled && cat.isSystem),
            }))}
            onChange={onChangeCategoryIds}
          />
        )}
      </div>
    </>
  );
}
