import { useState } from "react";
import { Badge, Container, Heading, Text, Button } from "@medusajs/ui";
import { CheckCircle2, Globe, Archive } from "lucide-react";
import { ChecklistItem } from "../../components/ui/medusa";
import { publishProduct, archiveProduct } from "../../lib/products-client";
import type { CatalogProduct } from "../../types";
import { InlineError } from "../../components/ui/medusa/inline-error";

type ProductDetailAsideProps = {
  product: CatalogProduct;
  mutate: () => Promise<void>;
};

function getBadgeColor(status: string): "green" | "red" | "blue" | "orange" | "grey" | "purple" {
  switch (status) {
    case "Published": return "green";
    case "Draft": return "grey";
    default: return "grey";
  }
}

export function ProductDetailAside({ product, mutate }: ProductDetailAsideProps) {
  const [isPublishing, setIsPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!product) return null;

  const handlePublish = async () => {
    setIsPublishing(true);
    setError(null);
    try {
      await publishProduct(product.id);
      await mutate();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to publish");
    } finally {
      setIsPublishing(false);
    }
  };

  const handleArchive = async () => {
    setIsPublishing(true);
    setError(null);
    try {
      await archiveProduct(product.id);
      await mutate();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to archive");
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <aside className="flex flex-col gap-y-6">
      <Container>
        <div className="flex flex-col gap-y-3">
          <div className="flex flex-col gap-y-1">
            <Heading level="h3">
              <CheckCircle2 className="-ml-1 mr-1 inline h-4 w-4 text-ui-fg-muted" />
              Publish status
            </Heading>
            <Text size="small" className="text-ui-fg-subtle">
              Feedback aligned to Medusa-like publish gating rules.
            </Text>
          </div>
          <ChecklistItem label="Product title exists" complete={product.title.trim().length > 0} />
          <ChecklistItem label="At least one variant exists" complete={product.variants.length > 0} />
          <ChecklistItem
            label="Variants have prices"
            complete={product.variants.length > 0 && product.variants.every(v => v.price > 0)}
          />
          {error && <div className="mt-2"><InlineError message={error} /></div>}
          <div className="mt-4 flex flex-col gap-y-2">
            {product.status === "Draft" || product.status === "Rejected" ? (
              <Button 
                variant="primary" 
                className="w-full" 
                onClick={() => void handlePublish()}
                isLoading={isPublishing}
              >
                <Globe className="mr-2 h-4 w-4" /> Publish Product
              </Button>
            ) : (
              <Button 
                variant="secondary" 
                className="w-full text-ui-fg-error hover:text-ui-fg-error" 
                onClick={() => void handleArchive()}
                isLoading={isPublishing}
              >
                <Archive className="mr-2 h-4 w-4" /> Archive / Unpublish
              </Button>
            )}
          </div>
        </div>
      </Container>

      <Container>
        <div className="flex flex-col gap-y-3">
          <div className="flex flex-col gap-y-1">
            <Heading level="h3">Current record</Heading>
            <Text size="small" className="text-ui-fg-subtle">
              Snapshot of the saved product.
            </Text>
          </div>
          <dl className="flex flex-col gap-y-2">
            <div className="flex items-center justify-between">
              <Text size="small" className="text-ui-fg-subtle">Handle</Text>
              <Text size="small" className="text-ui-fg-base">{product.handle}</Text>
            </div>
            <div className="flex items-center justify-between">
              <Text size="small" className="text-ui-fg-subtle">Saved status</Text>
              <Badge color={getBadgeColor(product.status)} size="xsmall" rounded="full">
                {product.status}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <Text size="small" className="text-ui-fg-subtle">Variants</Text>
              <Text size="small" className="text-ui-fg-base">{product.variants.length}</Text>
            </div>
            <div className="flex items-center justify-between">
              <Text size="small" className="text-ui-fg-subtle">Updated</Text>
              <Text size="small" className="text-ui-fg-base">{product.updatedAt}</Text>
            </div>
          </dl>
        </div>
      </Container>
    </aside>
  );
}
