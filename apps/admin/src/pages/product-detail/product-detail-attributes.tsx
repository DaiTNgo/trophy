import { Button, Container, Heading, Text } from "@medusajs/ui";
import { Image, Plus, Trash2 } from "lucide-react";
import { TextField } from "../../components/ui/medusa";
import { TextAreaField } from "../../components/ui/medusa/text-area-field";
import type { useProductDetail } from "./use-product-detail";

type ProductDetailAttributesProps = {
  state: ReturnType<typeof useProductDetail>;
};

export function ProductDetailAttributes({ state }: ProductDetailAttributesProps) {
  const { values, errors, attributes, setValue, updateAttribute, addAttributeRow, removeAttributeRow } = state;

  return (
    <Container>
      <div className="flex flex-col gap-y-3">
        <div className="flex flex-col gap-y-1">
          <Heading level="h3">
            <Image className="-ml-1 mr-1 inline h-4 w-4 text-ui-fg-muted" />
            Media and attributes
          </Heading>
          <Text size="small" className="text-ui-fg-subtle">
            Manage product-rich content that does not affect variant combinations.
          </Text>
        </div>
        <TextAreaField
          label="Media URLs"
          name="detail-media"
          value={values.media}
          hint="One URL per line."
          onChange={(value) => setValue("media", value)}
        />
        <div className="flex flex-col gap-y-3">
          <div className="flex items-center justify-between">
            <Text size="small" className="text-ui-fg-subtle">
              Attributes
            </Text>
            <Button type="button" variant="secondary" size="small" onClick={addAttributeRow}>
              <Plus className="h-4 w-4" />
              Add attribute
            </Button>
          </div>
          {attributes.map((attribute, index) => (
            <div
              key={`${index}-${attribute.key}-${attribute.value}`}
              className="grid gap-3 md:grid-cols-[1fr_1fr_auto]"
            >
              <TextField
                label={index === 0 ? "Attribute name" : ""}
                name={`detail-attribute-key-${index}`}
                value={attribute.key}
                onChange={(value) => updateAttribute(index, "key", value)}
              />
              <TextField
                label={index === 0 ? "Attribute value" : ""}
                name={`detail-attribute-value-${index}`}
                value={attribute.value}
                onChange={(value) => updateAttribute(index, "value", value)}
              />
              <div className="flex items-end">
                <Button
                  type="button"
                  variant="secondary"
                  size="small"
                  onClick={() => removeAttributeRow(index)}
                  disabled={attributes.length === 1}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
          {errors.attributes ? (
            <Text size="small" className="text-ui-fg-error">
              {errors.attributes}
            </Text>
          ) : null}
        </div>
      </div>
    </Container>
  );
}
