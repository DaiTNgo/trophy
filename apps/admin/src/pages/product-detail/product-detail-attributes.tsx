import { useState } from "react";
import { Button, Container, Heading, Text, Drawer, Input } from "@medusajs/ui";
import { ListFilter, Plus, Trash2, Edit } from "lucide-react";
import { updateProductAttributes } from "../../lib/products-client";
import type { CatalogProduct } from "../../types";
import { InlineError } from "../../components/ui/medusa/inline-error";

type ProductDetailAttributesProps = {
  product: CatalogProduct;
  mutate: () => Promise<void>;
};

export function ProductDetailAttributes({ product, mutate }: ProductDetailAttributesProps) {
  const [open, setOpen] = useState(false);
  const [attributes, setAttributes] = useState<{ key: string; value: string }[]>(
    product.attributes.map((a) => ({ key: a.key, value: a.value }))
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleOpen = (isOpen: boolean) => {
    if (isOpen) {
      setAttributes(product.attributes.map((a) => ({ key: a.key, value: a.value })));
      setError(null);
    }
    setOpen(isOpen);
  };

  const updateAttribute = (index: number, field: "key" | "value", value: string) => {
    const newAttrs = [...attributes];
    newAttrs[index][field] = value;
    setAttributes(newAttrs);
  };

  const addAttributeRow = () => {
    setAttributes([...attributes, { key: "", value: "" }]);
  };

  const removeAttributeRow = (index: number) => {
    setAttributes(attributes.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      const validAttrs = attributes.filter(a => a.key.trim() && a.value.trim());
      await updateProductAttributes(product.id, validAttrs.map(a => ({ name: a.key, value: a.value })));
      await mutate();
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save attributes");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Container>
      <div className="flex flex-col gap-y-3">
        <div className="flex items-start justify-between">
          <div className="flex flex-col gap-y-1">
            <Heading level="h3">
              <ListFilter className="-ml-1 mr-1 inline h-4 w-4 text-ui-fg-muted" />
              Attributes
            </Heading>
            <Text size="small" className="text-ui-fg-subtle">
              Optional product properties that do not affect variant combinations.
            </Text>
          </div>
          <Drawer open={open} onOpenChange={handleOpen}>
            <Drawer.Trigger asChild>
              <Button variant="secondary" size="small">
                <Edit className="h-4 w-4" />
                Edit
              </Button>
            </Drawer.Trigger>
            <Drawer.Content>
              <Drawer.Header>
                <Drawer.Title>Edit Attributes</Drawer.Title>
              </Drawer.Header>
              <Drawer.Body className="flex flex-col gap-y-6 overflow-y-auto">
                {error && <InlineError message={error} />}
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
                      key={index}
                      className="grid gap-3 md:grid-cols-[1fr_1fr_auto]"
                    >
                      <Input
                        value={attribute.key}
                        onChange={(e) => updateAttribute(index, "key", e.target.value)}
                        placeholder="Attribute name"
                      />
                      <Input
                        value={attribute.value}
                        onChange={(e) => updateAttribute(index, "value", e.target.value)}
                        placeholder="Attribute value"
                      />
                      <div className="flex items-end">
                        <Button
                          type="button"
                          variant="secondary"
                          size="small"
                          onClick={() => removeAttributeRow(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </Drawer.Body>
              <Drawer.Footer>
                <Drawer.Close asChild>
                  <Button variant="secondary" disabled={isSubmitting}>Cancel</Button>
                </Drawer.Close>
                <Button onClick={() => void handleSave()} isLoading={isSubmitting}>
                  Save
                </Button>
              </Drawer.Footer>
            </Drawer.Content>
          </Drawer>
        </div>

        <div className="flex flex-col gap-y-4 mt-2">
          <div>
            <Text size="small" className="text-ui-fg-subtle font-medium">Attributes</Text>
            {product.attributes && product.attributes.length > 0 ? (
              <div className="grid grid-cols-2 gap-4 mt-2">
                {product.attributes.map((attr, idx) => (
                  <div key={idx} className="flex flex-col">
                    <Text size="xsmall" className="text-ui-fg-muted">{attr.key}</Text>
                    <Text size="small" className="text-ui-fg-base">{attr.value}</Text>
                  </div>
                ))}
              </div>
            ) : (
              <Text size="small" className="text-ui-fg-base">No attributes defined.</Text>
            )}
          </div>
        </div>
      </div>
    </Container>
  );
}
