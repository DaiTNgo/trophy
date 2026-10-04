import { useEffect, useState } from "react";
import { Container, Heading, Text, Drawer, Button, Badge, DropdownMenu, IconButton, toast } from "@medusajs/ui";
import { MoreHorizontal } from "lucide-react";
import { ProductOrganizeEditor } from "../../components/products/product-organize-editor";
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
              <ProductOrganizeEditor
                collections={collections}
                categories={categories}
                selectedCollectionIds={collectionIds.map(String)}
                onChangeCollectionIds={(vals) => setCollectionIds(vals.map(Number))}
                selectedCategoryIds={categoryIds.map(String)}
                onChangeCategoryIds={(vals) => setCategoryIds(vals.map(Number))}
                isLoading={metaLoading}
                isCustomizationEnabled={Boolean(product.customization?.enabled)}
              />
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
