import { useState } from "react";
import { Container, Drawer, Heading, Label, Text, Button, toast } from "@medusajs/ui";
import { Pencil, FileText } from "lucide-react";
import type { CatalogProduct, LocalizedTextValue } from "../../types";
import { updateProductSections, type ProductSectionsPayload } from "../../lib/products-client";
import { RichTextEditor, type RichTextValueByLocale } from "../../components/rich-text/rich-text-editor";

type Props = { product: CatalogProduct; mutate: () => Promise<void> };

type SectionKey = "whyThisProductHtml" | "specificationsHtml" | "shippingHtml";

const SECTION_META: Array<{ key: SectionKey; label: string; description: string; placeholderByLocale: { vi: string; en: string } }> = [
  {
    key: "whyThisProductHtml",
    label: "Why This Product?",
    description: "Persuasive copy shown in the first product detail accordion.",
    placeholderByLocale: { vi: "Vì sao chọn sản phẩm này...", en: "Why this product..." },
  },
  {
    key: "specificationsHtml",
    label: "Specifications",
    description: "Technical details. When empty, the storefront falls back to the product attributes grid.",
    placeholderByLocale: { vi: "Thông số kỹ thuật...", en: "Specifications..." },
  },
  {
    key: "shippingHtml",
    label: "Shipping & fulfillment",
    description: "Shipping policy copy. When empty, the storefront shows the default policy.",
    placeholderByLocale: { vi: "Vận chuyển và giao hàng...", en: "Shipping & fulfillment..." },
  },
];

const fromLocalized = (value: LocalizedTextValue): RichTextValueByLocale => ({
  vi: { html: value.vi || "", json: null },
  en: { html: value.en || "", json: null },
});

const stripHtml = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

export function ProductDetailSections({ product, mutate }: Props) {
  const [editing, setEditing] = useState<SectionKey | null>(null);
  const [draft, setDraft] = useState<RichTextValueByLocale>(fromLocalized({ vi: "", en: "" }));
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleOpen = (key: SectionKey) => {
    setDraft(fromLocalized(product[key]));
    setEditing(key);
  };

  const handleSave = async () => {
    if (!editing) return;
    setIsSubmitting(true);
    try {
      const vi = draft.vi.html.trim();
      const en = draft.en.html.trim();
      const payload: ProductSectionsPayload = {
        [editing]: vi || en ? { vi: vi || undefined, en: en || undefined } : null,
      };
      await updateProductSections(product.id, payload);
      await mutate();
      setEditing(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save section";
      toast.error("Product section could not be saved", {
        description: message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Container className="p-0 overflow-hidden">
      <div className="px-6 py-4">
        <Heading level="h2" className="text-xl font-semibold">Product sections</Heading>
        <Text size="small" className="mt-1 text-ui-fg-subtle">Design the rich-text content of the product detail page accordions.</Text>
      </div>

      <div className="flex flex-col">
        {SECTION_META.map((section) => {
          const value = product[section.key];
          const hasContent = Boolean(value?.vi?.trim() || value?.en?.trim());
          return (
            <div key={section.key} className="flex items-start justify-between gap-4 border-t border-ui-border-base px-6 py-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 shrink-0 text-ui-fg-muted" />
                  <Label size="small" weight="plus">{section.label}</Label>
                </div>
                <Text size="xsmall" className="mt-1 text-ui-fg-muted">{section.description}</Text>
                {hasContent ? (
                  <Text size="small" className="mt-1 line-clamp-2 max-w-full text-ui-fg-subtle">
                    {stripHtml(value?.vi || value?.en || "")}
                  </Text>
                ) : (
                  <Text size="small" className="mt-1 text-ui-fg-muted italic">No content yet</Text>
                )}
              </div>
              <Button variant="secondary" size="small" onClick={() => handleOpen(section.key)}>
                <Pencil className="h-4 w-4" />
                Edit
              </Button>
            </div>
          );
        })}
      </div>

      <Drawer open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        <Drawer.Content className="!max-w-3xl">
          <Drawer.Header>
            <Drawer.Title>{SECTION_META.find((section) => section.key === editing)?.label}</Drawer.Title>
          </Drawer.Header>
          <Drawer.Body className="flex flex-col gap-y-4 overflow-y-auto">
            <div className="flex flex-col gap-y-1.5">
              <Label size="small" weight="plus" className="text-ui-fg-subtle">Content</Label>
              {editing ? (
                <RichTextEditor
                  key={editing}
                  label={SECTION_META.find((section) => section.key === editing)?.label}
                  placeholderByLocale={SECTION_META.find((section) => section.key === editing)?.placeholderByLocale}
                  valueByLocale={draft}
                  onChangeByLocale={(locale, value) => {
                    setDraft((current) => ({ ...current, [locale]: value }));
                  }}
                />
              ) : null}
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
    </Container>
  );
}