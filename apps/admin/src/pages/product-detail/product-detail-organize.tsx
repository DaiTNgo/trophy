import { Container, Heading, Text } from "@medusajs/ui";
import { Tags } from "lucide-react";
import { SelectField } from "../../components/ui/medusa/select-field";
import { CategoryMultiSelect } from "../../components/ui/medusa/category-multiselect";
import { collectionOptions, categoryOptions } from "../../lib/mock-data";
import type { useProductDetail } from "./use-product-detail";

type ProductDetailOrganizeProps = {
  state: ReturnType<typeof useProductDetail>;
};

export function ProductDetailOrganize({ state }: ProductDetailOrganizeProps) {
  const { values, setValue } = state;

  return (
    <Container>
      <div className="flex flex-col gap-y-3">
        <div className="flex flex-col gap-y-1">
          <Heading level="h3">
            <Tags className="-ml-1 mr-1 inline h-4 w-4 text-ui-fg-muted" />
            Organize
          </Heading>
          <Text size="small" className="text-ui-fg-subtle">
            Control collection placement, category assignment, and tags.
          </Text>
        </div>
        <div className="grid gap-5 md:grid-cols-1">
          <SelectField
            label="Collection (Shop by Interest)"
            value={values.collection}
            options={collectionOptions}
            onChange={(value) => setValue("collection", value)}
          />
          <Text size="small" className="text-ui-fg-subtle">
            Used for merchandising groupings like occasions or audiences.
          </Text>
        </div>
        <div className="flex flex-col gap-y-2 mt-5">
          <Text size="small" className="text-ui-fg-subtle">
            Categories (Shop by Product)
          </Text>
          <CategoryMultiSelect
            values={values.categories}
            options={categoryOptions}
            onChange={(categories) => setValue("categories", categories)}
          />
          <Text size="xsmall" className="text-ui-fg-muted">
            Shopper-facing product-kind placement. A product may belong to multiple categories.
          </Text>
        </div>
      </div>
    </Container>
  );
}
