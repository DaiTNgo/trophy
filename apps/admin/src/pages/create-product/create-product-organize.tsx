import { Heading, Text } from "@medusajs/ui";
import type { useCreateProduct } from "./use-create-product";
import { ProductOrganizeEditor } from "../../components/products/product-organize-editor";

type CreateProductOrganizeProps = {
  state: ReturnType<typeof useCreateProduct>;
};

export function CreateProductOrganize({ state }: CreateProductOrganizeProps) {
  const {
    metadata,
    selectedCollectionIds,
    setSelectedCollectionIds,
    selectedCategoryIds,
    setSelectedCategoryIds,
    values,
  } = state;

  return (
    <div className="space-y-8 ">
      <div>
        <Heading level="h2">Organize</Heading>
        <Text size="small" className="mt-1 text-ui-fg-subtle">
          Assign lightweight merchandising structure without mixing in pricing
          or shipping logic.
        </Text>
      </div>

      <div className="grid gap-5 md:grid-cols-1">
        <ProductOrganizeEditor
          collections={metadata.collections}
          categories={metadata.categories}
          selectedCollectionIds={selectedCollectionIds}
          onChangeCollectionIds={setSelectedCollectionIds}
          selectedCategoryIds={selectedCategoryIds}
          onChangeCategoryIds={setSelectedCategoryIds}
          isCustomizationEnabled={values.customizationEnabled}
        />
      </div>
    </div>
  );
}
