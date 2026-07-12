import { XMarkMini } from "@medusajs/icons";
import { Heading, IconButton, Label, Select, Text } from "@medusajs/ui";
import type { ReactNode } from "react";
import { CategoryMultiSelect } from "../../components/ui/medusa/category-multiselect";
import { InlineError } from "../../components/ui/medusa/inline-error";
import type { useCreateProduct } from "./use-create-product";

type CreateProductOrganizeProps = {
  state: ReturnType<typeof useCreateProduct>;
};

function OptionalFormLabel({ children }: { children: ReactNode }) {
  return (
    <Label className="flex items-center gap-x-1">
      {children}
      <Text as="span" size="small" className="text-ui-fg-muted">
        (Optional)
      </Text>
    </Label>
  );
}

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
          <OptionalFormLabel>Collection (Shop by Interest)</OptionalFormLabel>
          <div className="flex items-center gap-x-2">
            <div className="min-w-0 flex-1">
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
            </div>
            {selectedCollectionId ? (
              <IconButton
                type="button"
                variant="transparent"
                size="small"
                onClick={() => setSelectedCollectionId("")}
                disabled={isLoadingMetadata}
                aria-label="Clear collection"
              >
                <XMarkMini />
              </IconButton>
            ) : null}
          </div>
          <Text size="small" className="text-ui-fg-subtle">
            Used for merchandising groupings like occasions or audiences.
          </Text>
        </div>
      </div>

      <div className="grid gap-5 mt-5">
        <div className="space-y-2">
          <OptionalFormLabel>Categories (Shop by Product)</OptionalFormLabel>
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
