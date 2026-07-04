import { Heading, Label, Select, Text } from "@medusajs/ui";
import { CategoryMultiSelect } from "../../components/ui/medusa/category-multiselect";
import { InlineError } from "../../components/ui/medusa/inline-error";
import type { useCreateProduct } from "./use-create-product";

type CreateProductOrganizeProps = {
  state: ReturnType<typeof useCreateProduct>;
};

export function CreateProductOrganize({ state }: CreateProductOrganizeProps) {
  const {
    metadata,
    metadataError,
    isLoadingMetadata,
    selectedCollectionId,
    setSelectedCollectionId,
    selectedCategoryIds,
    setSelectedCategoryIds,
  } = state;

  return (
    <div className="space-y-8 ">
      <div>
        <Heading level="h2">Organize</Heading>
        <Text size="small" className="mt-1 text-ui-fg-subtle">
          Assign lightweight merchandising structure without mixing in pricing or shipping logic.
        </Text>
      </div>

      {metadataError ? <InlineError message={metadataError} /> : null}

      <div className="grid gap-5 md:grid-cols-1">
        <div className="space-y-2">
          <Label>Collection (Shop by Interest)</Label>
          <Select
            value={selectedCollectionId}
            onValueChange={setSelectedCollectionId}
            disabled={isLoadingMetadata}
          >
            <Select.Trigger>
              <Select.Value placeholder={isLoadingMetadata ? "Loading collections..." : "Select collection"} />
            </Select.Trigger>
            <Select.Content>
              {metadata.collections.map((option) => (
                <Select.Item key={option.id} value={String(option.id)}>
                  {option.label}
                </Select.Item>
              ))}
            </Select.Content>
          </Select>
          <Text size="small" className="text-ui-fg-subtle">
            Used for merchandising groupings like occasions or audiences.
          </Text>
        </div>
      </div>

      <div className="grid gap-5 mt-5">
        <div className="space-y-2">
          <Label>Categories (Shop by Product)</Label>
          <CategoryMultiSelect
            values={selectedCategoryIds}
            options={metadata.categories.map((category) => ({
              value: String(category.id),
              label: category.label,
            }))}
            onChange={setSelectedCategoryIds}
          />
          <Text size="small" className="text-ui-fg-subtle">
            Shopper-facing product-kind placement. A product may belong to multiple categories.
          </Text>
        </div>
      </div>
    </div>
  );
}
