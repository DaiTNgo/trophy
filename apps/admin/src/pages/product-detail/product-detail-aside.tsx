import { Badge, Container, Heading, Text } from "@medusajs/ui";
import { CheckCircle2 } from "lucide-react";
import { ChecklistItem } from "../../components/ui/medusa";
import { derivePublishedStatus } from "../../lib/product-utils";
import type { useProductDetail } from "./use-product-detail";

type ProductDetailAsideProps = {
  state: ReturnType<typeof useProductDetail>;
};

function getBadgeColor(
  status: string,
): "green" | "red" | "blue" | "orange" | "grey" | "purple" {
  switch (status) {
    case "Published":
      return "green";
    case "Draft":
      return "grey";
    default:
      return "grey";
  }
}

export function ProductDetailAside({ state }: ProductDetailAsideProps) {
  const { product, values, publishReady, variantPreview } = state;

  if (!product) return null;

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
          <ChecklistItem label="Product title exists" complete={values.title.trim().length > 0} />
          <ChecklistItem label="Publishable price set" complete={Number(values.basePrice || 0) > 0} />
          <ChecklistItem label="Variant structure valid" complete={publishReady.variantStructureValid} />
          <ChecklistItem
            label="At least one category or collection assigned"
            complete={values.collection !== "" || values.categories.length > 0}
          />
        </div>
      </Container>

      <Container>
        <div className="flex flex-col gap-y-3">
          <div className="flex flex-col gap-y-1">
            <Heading level="h3">Current record</Heading>
            <Text size="small" className="text-ui-fg-subtle">
              Snapshot of the saved product and current edits.
            </Text>
          </div>
          <dl className="flex flex-col gap-y-2">
            <div className="flex items-center justify-between">
              <Text size="small" className="text-ui-fg-subtle">
                Handle
              </Text>
              <Text size="small" className="text-ui-fg-base">
                {values.handle.trim() || product.handle}
              </Text>
            </div>
            <div className="flex items-center justify-between">
              <Text size="small" className="text-ui-fg-subtle">
                Saved status
              </Text>
              <Badge color={getBadgeColor(product.status)} size="xsmall" rounded="full">
                {product.status}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <Text size="small" className="text-ui-fg-subtle">
                Draft result
              </Text>
              <Text size="small" className="text-ui-fg-base">
                Draft
              </Text>
            </div>
            <div className="flex items-center justify-between">
              <Text size="small" className="text-ui-fg-subtle">
                Publish result
              </Text>
              <Text size="small" className="text-ui-fg-base">
                {derivePublishedStatus()}
              </Text>
            </div>
            <div className="flex items-center justify-between">
              <Text size="small" className="text-ui-fg-subtle">
                Variants
              </Text>
              <Text size="small" className="text-ui-fg-base">
                {variantPreview.length}
              </Text>
            </div>
            <div className="flex items-center justify-between">
              <Text size="small" className="text-ui-fg-subtle">
                Updated
              </Text>
              <Text size="small" className="text-ui-fg-base">
                {product.updatedAt}
              </Text>
            </div>
          </dl>
        </div>
      </Container>
    </aside>
  );
}
