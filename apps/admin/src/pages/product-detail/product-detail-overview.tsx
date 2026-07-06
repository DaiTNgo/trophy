import { useState } from "react";
import { Container, Heading, Text, Drawer, Button, Input, Textarea, StatusBadge, DropdownMenu, IconButton, Select, Label } from "@medusajs/ui";
import { MoreHorizontal } from "lucide-react";
import type { CatalogProduct } from "../../types";
import { updateProductOverview, publishProduct, archiveProduct } from "../../lib/products-client";
import { InlineError } from "../../components/ui/medusa/inline-error";

type ProductDetailOverviewProps = {
  product: CatalogProduct;
  mutate: () => Promise<void>;
};

export function ProductDetailOverview({ product, mutate }: ProductDetailOverviewProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(product.title);
  const [handle, setHandle] = useState(product.handle);
  const [subtitle, setSubtitle] = useState(product.subtitle ?? "");
  const [description, setDescription] = useState(product.description ?? "");
  const [status, setStatus] = useState<string>(product.status);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleOpen = (isOpen: boolean) => {
    if (isOpen) {
      setTitle(product.title);
      setHandle(product.handle);
      setSubtitle(product.subtitle ?? "");
      setDescription(product.description ?? "");
      setStatus(product.status);
      setError(null);
    }
    setOpen(isOpen);
  };

  const handleSave = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      await updateProductOverview(product.id, {
        title,
        handle,
        subtitle: subtitle || null,
        description: description || null,
      });

      if (status !== product.status) {
        if (status === "Published") {
          await publishProduct(product.id);
        } else {
          await archiveProduct(product.id);
        }
      }

      await mutate();
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save overview");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Container className="p-0 overflow-hidden">
      <div className="flex flex-col">
        <div className="flex items-center justify-between px-6 py-4">
          <Heading level="h2" className="text-xl font-semibold">{product.title}</Heading>
          <div className="flex items-center gap-x-2">
            <StatusBadge color={product.status === "Published" ? "green" : "grey"}>
              {product.status}
            </StatusBadge>
            <DropdownMenu>
              <DropdownMenu.Trigger asChild>
                <IconButton variant="transparent" size="small">
                  <MoreHorizontal className="h-4 w-4 text-ui-fg-muted" />
                </IconButton>
              </DropdownMenu.Trigger>
              <DropdownMenu.Content align="end">
                <DropdownMenu.Item onClick={() => handleOpen(true)}>
                  Edit
                </DropdownMenu.Item>
                <DropdownMenu.Item className="text-ui-fg-error">
                  Delete
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu>
          </div>
        </div>

        <Drawer open={open} onOpenChange={handleOpen}>
          <Drawer.Content>
            <Drawer.Header>
              <Drawer.Title>Edit Product</Drawer.Title>
            </Drawer.Header>
            <Drawer.Body className="flex flex-col gap-y-6 overflow-y-auto">
              {error && <InlineError message={error} />}
              <div className="flex flex-col gap-y-1.5">
                <Label size="small" weight="plus" className="text-ui-fg-subtle">Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <Select.Trigger>
                    <Select.Value />
                  </Select.Trigger>
                  <Select.Content>
                    <Select.Item value="Draft">Draft</Select.Item>
                    <Select.Item value="Published">Published</Select.Item>
                  </Select.Content>
                </Select>
              </div>
              <div className="grid gap-5 md:grid-cols-2">
                <div className="flex flex-col gap-y-1.5">
                  <span className="text-sm text-ui-fg-subtle">Title</span>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Product title"
                  />
                </div>
                <div className="flex flex-col gap-y-1.5">
                  <span className="text-sm text-ui-fg-subtle">Handle</span>
                  <Input
                    value={handle}
                    onChange={(e) => setHandle(e.target.value)}
                    placeholder="product-handle"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-y-1.5">
                <span className="text-sm text-ui-fg-subtle">Subtitle</span>
                <Input
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                  placeholder="Optional subtitle"
                />
              </div>
              <div className="flex flex-col gap-y-1.5">
                <span className="text-sm text-ui-fg-subtle">Description</span>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Product description"
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
          <div className="grid grid-cols-2 px-6 py-4 border-t border-ui-border-base">
            <Text size="small" className="text-ui-fg-subtle font-medium">Description</Text>
            <Text size="small" className="text-ui-fg-base pr-4">{product.description || "—"}</Text>
          </div>
          <div className="grid grid-cols-2 px-6 py-4 border-t border-ui-border-base">
            <Text size="small" className="text-ui-fg-subtle font-medium">Subtitle</Text>
            <Text size="small" className="text-ui-fg-base">{product.subtitle || "—"}</Text>
          </div>
          <div className="grid grid-cols-2 px-6 py-4 border-t border-ui-border-base">
            <Text size="small" className="text-ui-fg-subtle font-medium">Handle</Text>
            <Text size="small" className="text-ui-fg-base">{product.handle || "—"}</Text>
          </div>
          <div className="grid grid-cols-2 px-6 py-4 border-t border-ui-border-base">
            <Text size="small" className="text-ui-fg-subtle font-medium">Material</Text>
            <Text size="small" className="text-ui-fg-base">—</Text>
          </div>
          <div className="grid grid-cols-2 px-6 py-4 border-t border-ui-border-base">
            <Text size="small" className="text-ui-fg-subtle font-medium">Discountable</Text>
            <Text size="small" className="text-ui-fg-base">True</Text>
          </div>
        </div>
      </div>
    </Container>
  );
}
