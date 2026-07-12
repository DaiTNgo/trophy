import { useState } from "react";
import { Container, Heading, Text, Drawer, Button, Input, StatusBadge, DropdownMenu, IconButton, Select, Label, toast } from "@medusajs/ui";
import { MoreHorizontal } from "lucide-react";
import type { CatalogProduct } from "../../types";
import { updateProductOverview, publishProduct, archiveProduct } from "../../lib/products-client";
import { InlineError } from "../../components/ui/medusa/inline-error";
import { LocalizedTextField } from "../../components/ui/medusa";
import type { AdminLocale } from "../../types";

type ProductDetailOverviewProps = {
  product: CatalogProduct;
  mutate: () => Promise<void>;
};

export function ProductDetailOverview({ product, mutate }: ProductDetailOverviewProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(product.title);
  const [handle, setHandle] = useState(product.handle);
  const [subtitle, setSubtitle] = useState(product.subtitle ?? { vi: "", en: "" });
  const [description, setDescription] = useState(product.description ?? { vi: "", en: "" });
  const [status, setStatus] = useState<string>(product.status);
  const [titleLocale, setTitleLocale] = useState<AdminLocale>("vi");
  const [subtitleLocale, setSubtitleLocale] = useState<AdminLocale>("vi");
  const [descriptionLocale, setDescriptionLocale] = useState<AdminLocale>("vi");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleOpen = (isOpen: boolean) => {
    if (isOpen) {
      setTitle(product.title);
      setHandle(product.handle);
      setSubtitle(product.subtitle ?? { vi: "", en: "" });
      setDescription(product.description ?? { vi: "", en: "" });
      setStatus(product.status);
      setError(null);
    }
    setOpen(isOpen);
  };

  const handleSave = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      if (!title.vi.trim()) {
        throw new Error("Vietnamese product title is required.");
      }

      await updateProductOverview(product.id, {
        title: { vi: title.vi, en: title.en || undefined },
        handle,
        subtitle: subtitle.vi ? { vi: subtitle.vi, en: subtitle.en || undefined } : null,
        description: description.vi ? { vi: description.vi, en: description.en || undefined } : null,
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
      const message = err instanceof Error ? err.message : "Failed to save overview";
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
          <Heading level="h2" className="text-xl font-semibold">{product.title?.vi || product.title?.en}</Heading>
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
                  <Label htmlFor="edit-title-vi" size="small" weight="plus">
                    Title
                  </Label>
                  <LocalizedTextField
                    id="edit-title"
                    value={title}
                    locale={titleLocale}
                    onLocaleChange={setTitleLocale}
                    onChange={setTitle}
                    placeholder={{ vi: "Tieu de", en: "Product title" }}
                    requiredLocales={["vi"]}
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
                <Label htmlFor="edit-subtitle-vi" size="small" weight="plus" className="flex items-center gap-x-1">
                  Subtitle
                  <Text as="span" size="small" className="text-ui-fg-muted">
                    (Optional)
                  </Text>
                </Label>
                <LocalizedTextField
                  id="edit-subtitle"
                  value={subtitle}
                  locale={subtitleLocale}
                  onLocaleChange={setSubtitleLocale}
                  onChange={setSubtitle}
                  placeholder={{ vi: "Tieu de phu", en: "Optional subtitle" }}
                  requiredLocales={[]}
                />
              </div>
              <div className="flex flex-col gap-y-1.5">
                <Label htmlFor="edit-description-vi" size="small" weight="plus" className="flex items-center gap-x-1">
                  Description
                  <Text as="span" size="small" className="text-ui-fg-muted">
                    (Optional)
                  </Text>
                </Label>
                <LocalizedTextField
                  id="edit-description"
                  value={description}
                  locale={descriptionLocale}
                  onLocaleChange={setDescriptionLocale}
                  onChange={setDescription}
                  placeholder={{ vi: "Mo ta", en: "Product description" }}
                  requiredLocales={[]}
                  multiline
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
            <Text size="small" className="text-ui-fg-base pr-4">{product.description?.vi || product.description?.en || "—"}</Text>
          </div>
          <div className="grid grid-cols-2 px-6 py-4 border-t border-ui-border-base">
            <Text size="small" className="text-ui-fg-subtle font-medium">Subtitle</Text>
            <Text size="small" className="text-ui-fg-base">{product.subtitle?.vi || product.subtitle?.en || "—"}</Text>
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
