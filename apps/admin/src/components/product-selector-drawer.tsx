import { useState, useEffect } from "react";
import { Drawer, Button, Table, Checkbox, Text, Input } from "@medusajs/ui";
import { fetchProducts } from "../lib/products-client";

interface ProductSelectorDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  initialSelectedIds: string[];
  onSave: (selectedIds: string[]) => Promise<void>;
}

export function ProductSelectorDrawer({
  open,
  onOpenChange,
  title,
  description,
  initialSelectedIds,
  onSave,
}: ProductSelectorDrawerProps) {
  const [products, setProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (open) {
      setSelectedIds(new Set(initialSelectedIds));
      loadProducts();
    }
  }, [open, initialSelectedIds]);

  async function loadProducts() {
    setIsLoading(true);
    try {
      const items = await fetchProducts();
      setProducts(items);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSave() {
    setIsSaving(true);
    try {
      await onSave(Array.from(selectedIds));
      onOpenChange(false);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  }

  function toggleProduct(id: string) {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  }

  const filteredProducts = products.filter((p) =>
    p.title.toLowerCase().includes(search.toLowerCase()) ||
    (p.handle && p.handle.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <Drawer.Content className="right-2 z-50">
        <Drawer.Header>
          <Drawer.Title>{title}</Drawer.Title>
          <Drawer.Description>{description}</Drawer.Description>
        </Drawer.Header>
        <Drawer.Body className="p-4 flex flex-col gap-4 overflow-y-auto">
          <Input
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {isLoading ? (
            <Text>Loading products...</Text>
          ) : (
            <div className="border rounded-md overflow-hidden">
              <Table>
                <Table.Header>
                  <Table.Row>
                    <Table.HeaderCell className="w-12"></Table.HeaderCell>
                    <Table.HeaderCell>Product</Table.HeaderCell>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {filteredProducts.map((product) => {
                    const idStr = product.id.toString();
                    return (
                      <Table.Row key={product.id}>
                        <Table.Cell>
                          <Checkbox
                            checked={selectedIds.has(idStr)}
                            onCheckedChange={() => toggleProduct(idStr)}
                          />
                        </Table.Cell>
                        <Table.Cell>
                          <Text size="small" weight="plus">
                            {product.title}
                          </Text>
                          {product.handle && (
                            <Text size="xsmall" className="text-ui-fg-subtle">
                              /{product.handle}
                            </Text>
                          )}
                        </Table.Cell>
                      </Table.Row>
                    );
                  })}
                </Table.Body>
              </Table>
            </div>
          )}
        </Drawer.Body>
        <Drawer.Footer>
          <Drawer.Close asChild>
            <Button variant="secondary">Cancel</Button>
          </Drawer.Close>
          <Button onClick={handleSave} isLoading={isSaving}>
            Save
          </Button>
        </Drawer.Footer>
      </Drawer.Content>
    </Drawer>
  );
}
