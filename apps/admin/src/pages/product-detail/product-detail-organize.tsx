import { useEffect, useState } from "react";
import { Container, Heading, Text, Drawer, Button, Badge, Label, DropdownMenu, IconButton, toast } from "@medusajs/ui";
import { MoreHorizontal } from "lucide-react";
import { CategoryMultiSelect } from "../../components/ui/medusa/category-multiselect";
import type { CatalogProduct } from "../../types";
import { updateProductOrganization } from "../../lib/products-client";
import { fetchProductMetadata, type ProductMetadataItem } from "../../lib/product-metadata-client";

type ProductDetailOrganizeProps = {
  product: CatalogProduct;
  mutate: () => Promise<void>;
};

export function ProductDetailOrganize({ product, mutate }: ProductDetailOrganizeProps) {
  const [open, setOpen] = useState(false);

  // Form state — numeric IDs
  const [collectionIds, setCollectionIds] = useState<number[]>(
    product.collectionIds ?? (product.collectionId ? [product.collectionId] : []),
  );
  const [categoryIds, setCategoryIds] = useState<number[]>(product.categoryIds ?? []);

  // Remote metadata
  const [collections, setCollections] = useState<ProductMetadataItem[]>([]);
  const [categories, setCategories] = useState<ProductMetadataItem[]>([]);
  const [metaLoading, setMetaLoading] = useState(false);

  // Submit state
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch metadata once when the drawer opens
  useEffect(() => {
    if (!open) return;

    // Reset form to current product state
    setCollectionIds(
      product.collectionIds ?? (product.collectionId ? [product.collectionId] : []),
    );
    setCategoryIds(product.categoryIds ?? []);

    setMetaLoading(true);
    fetchProductMetadata()
      .then((meta) => {
        setCollections(meta.collections);
        setCategories(meta.categories);
      })
      .catch((err: unknown) => {
        toast.error("Product organization options could not be loaded", {
          description: `${err instanceof Error ? err.message : "Failed to load collections and categories."} Close and reopen the editor, then try again.`,
        });
      })
      .finally(() => setMetaLoading(false));
  }, [open, product.collectionIds, product.collectionId, product.categoryIds]);

  const handleSave = async () => {
    setIsSubmitting(true);
    try {
      await updateProductOrganization(product.id, {
        collectionIds,
        categoryIds,
      });
      await mutate();
      setOpen(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save organization";
      toast.error("Product organization could not be saved", {
        description: `${message} Review the collection and category selections, then try again.`,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const LoadingPlaceholder = () => (
    <div className="rounded-md border border-ui-border-base bg-ui-bg-base px-3 py-2 text-sm text-ui-fg-muted">
      Loading…
    </div>
  );

  return (
    <Container className="p-0 overflow-hidden">
      <div className="flex flex-col">
        <div className="flex items-center justify-between px-6 py-4">
          <Heading level="h2" className="text-xl font-semibold">Organize</Heading>
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

        <Drawer open={open} onOpenChange={setOpen}>
          <Drawer.Content>
            <Drawer.Header>
              <Drawer.Title>Edit Organization</Drawer.Title>
            </Drawer.Header>
            <Drawer.Body className="flex flex-col gap-y-6 overflow-y-auto">
              {/* Collections */}
              <div className="flex flex-col gap-y-2">
                <Label>Collections</Label>
                <Text size="xsmall" className="text-ui-fg-muted">
                  Merchandising grouping (e.g. occasion or audience).
                </Text>
                {metaLoading ? (
                  <LoadingPlaceholder />
                ) : (
                  <CategoryMultiSelect
                    values={collectionIds.map(String)}
                    options={collections.map((col) => ({
                      value: String(col.id),
                      label: col.label,
                    }))}
                    onChange={(vals) => setCollectionIds(vals.map(Number))}
                    placeholder="Select collections"
                    searchPlaceholder="Search collections..."
                    emptyText="No collections found"
                  />
                )}
              </div>

              {/* Categories */}
              <div className="flex flex-col gap-y-2">
                <Label>Categories</Label>
                <Text size="xsmall" className="text-ui-fg-muted">
                  Shopper-facing placement. A product may belong to multiple categories.
                </Text>
                {metaLoading ? (
                  <LoadingPlaceholder />
                ) : (
                  <CategoryMultiSelect
                    values={categoryIds.map(String)}
                    options={categories.map((cat) => ({
                      value: String(cat.id),
                      label: cat.label,
                      locked: Boolean(product.customization?.enabled && cat.isSystem),
                    }))}
                    onChange={(vals) => setCategoryIds(vals.map(Number))}
                  />
                )}
              </div>
            </Drawer.Body>
            <Drawer.Footer>
              <Drawer.Close asChild>
                <Button variant="secondary" disabled={isSubmitting}>
                  Cancel
                </Button>
              </Drawer.Close>
              <Button
                onClick={() => void handleSave()}
                isLoading={isSubmitting}
                disabled={metaLoading}
              >
                Save
              </Button>
            </Drawer.Footer>
          </Drawer.Content>
        </Drawer>

        {/* Read-only display */}
        <div className="flex flex-col">
          <div className="grid grid-cols-2 px-6 py-4 border-t border-ui-border-base">
            <Text size="small" className="text-ui-fg-subtle font-medium">Collections</Text>
            {product.collections?.length ? (
              <div className="flex flex-wrap gap-1">
                {product.collections.map((col) => (
                  <Badge key={col} size="xsmall">
                    {col}
                  </Badge>
                ))}
              </div>
            ) : product.collection ? (
              <Text size="small" className="text-ui-fg-base">
                {product.collection}
              </Text>
            ) : (
              <Text size="small" className="text-ui-fg-base">
                —
              </Text>
            )}
          </div>
          <div className="grid grid-cols-2 px-6 py-4 border-t border-ui-border-base">
            <Text size="small" className="text-ui-fg-subtle font-medium">Categories</Text>
            {product.categories?.length ? (
              <div className="flex flex-wrap gap-1">
                {product.categories.map((cat) => (
                  <Badge key={cat} size="xsmall">
                    {cat}
                  </Badge>
                ))}
              </div>
            ) : (
              <Text size="small" className="text-ui-fg-base">
                —
              </Text>
            )}
          </div>
        </div>
      </div>
    </Container>
  );
}
