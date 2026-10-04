import { useState } from "react";
import { Button, Container, Heading, Text, Drawer, DropdownMenu, IconButton, toast } from "@medusajs/ui";
import { MoreHorizontal } from "lucide-react";
import { updateProductAttributes } from "../../lib/products-client";
import type { CatalogProduct, ProductAttribute, AdminLocale } from "../../types";
import { ProductAttributesEditor } from "../../components/products/product-attributes-editor";

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

  const [attributeLocale, setAttributeLocale] = useState<AdminLocale>("vi");

  const handleOpen = (isOpen: boolean) => {
    if (isOpen) {
      setAttributes(product.attributes.map((a) => ({ key: { ...a.key }, value: { ...a.value } })));
      setAttributeLocale("vi");
    }
    setOpen(isOpen);
  };

  const handleSave = async () => {
    setIsSubmitting(true);
    try {
      const validAttrs = attributes.filter(a => a.key.vi.trim() && a.value.vi.trim());
      await updateProductAttributes(product.id, validAttrs.map(a => ({ name: a.key, value: a.value })));
      await mutate();
      setOpen(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save attributes";
      toast.error("Attributes could not be saved", {
        description: `${message} Check that each attribute has both a name and a Vietnamese value, then try again.`,
      });
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
              <div className="flex flex-col gap-y-3">
                <Text size="small" className="text-ui-fg-subtle">
                  Attributes
                </Text>
                <ProductAttributesEditor
                  attributes={attributes}
                  onChange={setAttributes}
                  locale={attributeLocale}
                  onLocaleChange={setAttributeLocale}
                />
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
