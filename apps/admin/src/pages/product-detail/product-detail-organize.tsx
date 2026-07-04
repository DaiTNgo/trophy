import { useEffect, useState } from "react";
import { Container, Heading, Text, Drawer, Button, Select, Badge, Label } from "@medusajs/ui";
import { Tags, Edit } from "lucide-react";
import { CategoryMultiSelect } from "../../components/ui/medusa/category-multiselect";
import type { CatalogProduct } from "../../types";
import { updateProductOrganization } from "../../lib/products-client";
import { fetchProductMetadata, type ProductMetadataItem } from "../../lib/product-metadata-client";
import { InlineError } from "../../components/ui/medusa/inline-error";

type ProductDetailOrganizeProps = {
  product: CatalogProduct;
  mutate: () => Promise<void>;
};

export function ProductDetailOrganize({ product, mutate }: ProductDetailOrganizeProps) {
  const [open, setOpen] = useState(false);

  // Form state — numeric IDs
  const [typeId, setTypeId] = useState<number | null>(product.typeId);
  const [collectionId, setCollectionId] = useState<number | null>(product.collectionId);
  const [categoryIds, setCategoryIds] = useState<number[]>(product.categoryIds ?? []);
  const [tagIds, setTagIds] = useState<number[]>(product.tagIds ?? []);

  // Remote metadata
  const [types, setTypes] = useState<ProductMetadataItem[]>([]);
  const [collections, setCollections] = useState<ProductMetadataItem[]>([]);
  const [categories, setCategories] = useState<ProductMetadataItem[]>([]);
  const [tags, setTags] = useState<ProductMetadataItem[]>([]);
  const [metaLoading, setMetaLoading] = useState(false);
  const [metaError, setMetaError] = useState<string | null>(null);

  // Submit state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch metadata once when the drawer opens
  useEffect(() => {
    if (!open) return;

    // Reset form to current product state
    setTypeId(product.typeId);
    setCollectionId(product.collectionId);
    setCategoryIds(product.categoryIds ?? []);
    setTagIds(product.tagIds ?? []);
    setError(null);

    setMetaLoading(true);
    setMetaError(null);
    fetchProductMetadata()
      .then((meta) => {
        setTypes(meta.types);
        setCollections(meta.collections);
        setCategories(meta.categories);
        setTags(meta.tags);
      })
      .catch((err: unknown) => {
        setMetaError(err instanceof Error ? err.message : "Failed to load options");
      })
      .finally(() => setMetaLoading(false));
  }, [open, product.typeId, product.collectionId, product.categoryIds, product.tagIds]);

  const handleSave = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      await updateProductOrganization(product.id, {
        typeId: typeId ?? null,
        collectionId: collectionId ?? null,
        categoryIds,
        tagIds,
      });
      await mutate();
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save organization");
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
    <Container>
      <div className="flex flex-col gap-y-3">
        <div className="flex items-start justify-between">
          <div className="flex flex-col gap-y-1">
            <Heading level="h3">
              <Tags className="-ml-1 mr-1 inline h-4 w-4 text-ui-fg-muted" />
              Organize
            </Heading>
            <Text size="small" className="text-ui-fg-subtle">
              Control type, collection, categories, and tags.
            </Text>
          </div>
          <Drawer open={open} onOpenChange={setOpen}>
            <Drawer.Trigger asChild>
              <Button variant="secondary" size="small">
                <Edit className="h-4 w-4" />
                Edit
              </Button>
            </Drawer.Trigger>
            <Drawer.Content>
              <Drawer.Header>
                <Drawer.Title>Edit Organization</Drawer.Title>
              </Drawer.Header>
              <Drawer.Body className="flex flex-col gap-y-6">
                {error && <InlineError message={error} />}
                {metaError && <InlineError message={metaError} />}

                {/* Type */}
                <div className="flex flex-col gap-y-2">
                  <Label>Type</Label>
                  <Text size="xsmall" className="text-ui-fg-muted">
                    Broad product category used for internal classification.
                  </Text>
                  {metaLoading ? (
                    <LoadingPlaceholder />
                  ) : (
                    <Select
                      value={typeId !== null ? String(typeId) : ""}
                      onValueChange={(val) => setTypeId(val === "" ? null : Number(val))}
                    >
                      <Select.Trigger>
                        <Select.Value placeholder="No type" />
                      </Select.Trigger>
                      <Select.Content>
                        <Select.Item value="">
                          <span className="text-ui-fg-muted">No type</span>
                        </Select.Item>
                        {types.map((t) => (
                          <Select.Item key={t.id} value={String(t.id)}>
                            {t.label}
                          </Select.Item>
                        ))}
                      </Select.Content>
                    </Select>
                  )}
                </div>

                {/* Collection */}
                <div className="flex flex-col gap-y-2">
                  <Label>Collection</Label>
                  <Text size="xsmall" className="text-ui-fg-muted">
                    Merchandising grouping (e.g. occasion or audience).
                  </Text>
                  {metaLoading ? (
                    <LoadingPlaceholder />
                  ) : (
                    <Select
                      value={collectionId !== null ? String(collectionId) : ""}
                      onValueChange={(val) =>
                        setCollectionId(val === "" ? null : Number(val))
                      }
                    >
                      <Select.Trigger>
                        <Select.Value placeholder="No collection" />
                      </Select.Trigger>
                      <Select.Content>
                        <Select.Item value="">
                          <span className="text-ui-fg-muted">No collection</span>
                        </Select.Item>
                        {collections.map((col) => (
                          <Select.Item key={col.id} value={String(col.id)}>
                            {col.label}
                          </Select.Item>
                        ))}
                      </Select.Content>
                    </Select>
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
                      }))}
                      onChange={(vals) => setCategoryIds(vals.map(Number))}
                    />
                  )}
                </div>

                {/* Tags */}
                <div className="flex flex-col gap-y-2">
                  <Label>Tags</Label>
                  <Text size="xsmall" className="text-ui-fg-muted">
                    Keyword labels for filtering and search.
                  </Text>
                  {metaLoading ? (
                    <LoadingPlaceholder />
                  ) : (
                    <CategoryMultiSelect
                      values={tagIds.map(String)}
                      options={tags.map((tag) => ({
                        value: String(tag.id),
                        label: tag.label,
                      }))}
                      onChange={(vals) => setTagIds(vals.map(Number))}
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
        </div>

        {/* Read-only display */}
        <div className="flex flex-col gap-y-4 mt-2">
          <div>
            <Text size="small" className="text-ui-fg-subtle font-medium">
              Type
            </Text>
            <Text size="small" className="text-ui-fg-base">
              {product.type || "—"}
            </Text>
          </div>
          <div>
            <Text size="small" className="text-ui-fg-subtle font-medium">
              Collection
            </Text>
            <Text size="small" className="text-ui-fg-base">
              {product.collection || "—"}
            </Text>
          </div>
          <div>
            <Text size="small" className="text-ui-fg-subtle font-medium">
              Categories
            </Text>
            {product.categories?.length ? (
              <div className="flex flex-wrap gap-1 mt-1">
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
          <div>
            <Text size="small" className="text-ui-fg-subtle font-medium">
              Tags
            </Text>
            {product.tags?.length ? (
              <div className="flex flex-wrap gap-1 mt-1">
                {product.tags.map((tag) => (
                  <Badge key={tag} size="xsmall" color="grey">
                    {tag}
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
