import { useState } from "react";
import { Container, Heading, Text, Drawer, Button } from "@medusajs/ui";
import { Edit } from "lucide-react";
import { TextField } from "../../components/ui/medusa";
import { TextAreaField } from "../../components/ui/medusa/text-area-field";
import type { CatalogProduct } from "../../types";
import { updateProductOverview } from "../../lib/products-client";
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleOpen = (isOpen: boolean) => {
    if (isOpen) {
      setTitle(product.title);
      setHandle(product.handle);
      setSubtitle(product.subtitle ?? "");
      setDescription(product.description ?? "");
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
      await mutate();
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save overview");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Container>
      <div className="flex flex-col gap-y-3">
        <div className="flex items-start justify-between">
          <div className="flex flex-col gap-y-1">
            <Heading level="h3">Overview</Heading>
            <Text size="small" className="text-ui-fg-subtle">
              The core identity and descriptive content shown for this product.
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
                <Drawer.Title>Edit Overview</Drawer.Title>
              </Drawer.Header>
              <Drawer.Body className="flex flex-col gap-y-6">
                {error && <InlineError message={error} />}
                <div className="grid gap-5 md:grid-cols-2">
                  <TextField
                    label="Title"
                    name="detail-title"
                    value={title}
                    onChange={(val) => setTitle(val)}
                  />
                  <TextField
                    label="Handle"
                    name="detail-handle"
                    value={handle}
                    onChange={(val) => setHandle(val)}
                  />
                </div>
                <div className="grid gap-5 md:grid-cols-1">
                  <TextField
                    label="Subtitle"
                    name="detail-subtitle"
                    value={subtitle}
                    onChange={(val) => setSubtitle(val)}
                  />
                </div>
                <TextAreaField
                  label="Description"
                  name="detail-description"
                  value={description}
                  onChange={(val) => setDescription(val)}
                />
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
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Text size="small" className="text-ui-fg-subtle font-medium">Title</Text>
              <Text size="small" className="text-ui-fg-base">{product.title || "—"}</Text>
            </div>
            <div>
              <Text size="small" className="text-ui-fg-subtle font-medium">Handle</Text>
              <Text size="small" className="text-ui-fg-base">{product.handle || "—"}</Text>
            </div>
            <div>
              <Text size="small" className="text-ui-fg-subtle font-medium">Subtitle</Text>
              <Text size="small" className="text-ui-fg-base">{product.subtitle || "—"}</Text>
            </div>
          </div>
          <div>
            <Text size="small" className="text-ui-fg-subtle font-medium">Description</Text>
            <Text size="small" className="text-ui-fg-base max-w-prose line-clamp-4">
              {product.description || "—"}
            </Text>
          </div>
        </div>
      </div>
    </Container>
  );
}
