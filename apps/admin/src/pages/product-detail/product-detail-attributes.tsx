import { useState } from "react";
import { Button, Container, Heading, Text, Drawer, DropdownMenu, IconButton, toast } from "@medusajs/ui";
import { Plus, Trash2, MoreHorizontal } from "lucide-react";
import { updateProductAttributes } from "../../lib/products-client";
import type { CatalogProduct, ProductAttribute, AdminLocale, LocalizedTextValue } from "../../types";
import { InlineError } from "../../components/ui/medusa/inline-error";
import { LocalizedTextField } from "../../components/ui/medusa";

type ProductDetailAttributesProps = {
  product: CatalogProduct;
  mutate: () => Promise<void>;
};

export function ProductDetailAttributes({ product, mutate }: ProductDetailAttributesProps) {
  const [open, setOpen] = useState(false);
  const [attributes, setAttributes] = useState<ProductAttribute[]>(
    product.attributes.map((a) => ({ key: a.key, value: a.value }))
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [attributeLocale, setAttributeLocale] = useState<AdminLocale>("vi");

  const handleOpen = (isOpen: boolean) => {
    if (isOpen) {
      setAttributes(product.attributes.map((a) => ({ key: { ...a.key }, value: { ...a.value } })));
      setError(null);
      setAttributeLocale("vi");
    }
    setOpen(isOpen);
  };

  const updateAttributeField = (index: number, field: "key" | "value", value: LocalizedTextValue) => {
    const newAttrs = [...attributes];
    newAttrs[index][field] = value;
    setAttributes(newAttrs);
  };

  const addAttributeRow = () => {
    setAttributes([...attributes, { key: { vi: "", en: "" }, value: { vi: "", en: "" } }]);
  };

  const removeAttributeRow = (index: number) => {
    setAttributes(attributes.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      const validAttrs = attributes.filter(a => a.key.vi.trim() && a.value.vi.trim());
      await updateProductAttributes(product.id, validAttrs.map(a => ({ name: a.key, value: a.value })));
      await mutate();
      setOpen(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save attributes";
      setError(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Container className="p-0 overflow-hidden">
      <div className="flex flex-col">
        <div className="flex items-center justify-between px-6 py-4">
          <Heading level="h2" className="text-xl font-semibold">Attributes</Heading>
          <DropdownMenu>
            <DropdownMenu.Trigger asChild>
              <IconButton variant="transparent" size="small">
                <MoreHorizontal className="h-4 w-4 text-ui-fg-muted" />
              </IconButton>
            </DropdownMenu.Trigger>
            <DropdownMenu.Content align="end">
              <DropdownMenu.Item onClick={() => setOpen(true)}>
                Edit
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu>
        </div>

        <Drawer open={open} onOpenChange={handleOpen}>
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
                    className="flex gap-3 items-center"
                  >
                    <div className="flex-1 min-w-0">
                      <LocalizedTextField
                        id={`attribute-key-${index}`}
                        value={attribute.key}
                        locale={attributeLocale}
                        onLocaleChange={setAttributeLocale}
                        onChange={(val) => updateAttributeField(index, "key", val)}
                        placeholder={{ vi: "Attribute name", en: "Attribute name" }}
                        // requiredLocales={["vi"]}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <LocalizedTextField
                        id={`attribute-value-${index}`}
                        value={attribute.value}
                        locale={attributeLocale}
                        onLocaleChange={setAttributeLocale}
                        onChange={(val) => updateAttributeField(index, "value", val)}
                        placeholder={{ vi: "Attribute value", en: "Attribute value" }}
                        // requiredLocales={["vi"]}
                      />
                    </div>
                    <IconButton
                      type="button"
                      variant="transparent"
                      onClick={() => removeAttributeRow(index)}
                    >
                      <Trash2 className="h-4 w-4 text-ui-fg-error" />
                    </IconButton>
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

        <div className="flex flex-col">
          {product.attributes && product.attributes.length > 0 ? (
            product.attributes.map((attr, idx) => (
              <div
                key={idx}
                className="grid grid-cols-2 px-6 py-4 border-t border-ui-border-base"
              >
                <Text size="small" className="text-ui-fg-subtle font-medium">{attr.key.vi}</Text>
                <Text size="small" className="text-ui-fg-base">{attr.value.vi}</Text>
              </div>
            ))
          ) : (
            <div className="border-t border-ui-border-base px-6 py-4 flex items-center justify-center">
              <Text size="small" className="text-ui-fg-muted">No attributes defined.</Text>
            </div>
          )}
        </div>
      </div>
    </Container>
  );
}
