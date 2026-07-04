import { Link } from "react-router";
import { Button, Container, Heading, Text } from "@medusajs/ui";
import { ArrowLeft, Save, Send } from "lucide-react";
import { InlineError } from "../components/ui/medusa/inline-error";

import { useProductDetail } from "./product-detail/use-product-detail";
import { ProductDetailOverview } from "./product-detail/product-detail-overview";
import { ProductDetailOrganize } from "./product-detail/product-detail-organize";
import { ProductDetailAttributes } from "./product-detail/product-detail-attributes";
import { ProductDetailVariants } from "./product-detail/product-detail-variants";
import { ProductDetailAside } from "./product-detail/product-detail-aside";
import { VariantGallery } from "./product-detail/variant-gallery";

export function ProductDetailPage() {
  const state = useProductDetail();
  const { product, errors, isSubmittingMedia, save } = state;

  if (!product) {
    return (
      <div className="flex flex-col gap-y-6">
        <Container>
          <div className="flex flex-col gap-y-3">
            <Text size="small" className="text-ui-fg-muted uppercase tracking-wider">
              Products
            </Text>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex flex-col gap-y-1">
                <Heading level="h2">Product not found</Heading>
                <Text size="base" className="text-ui-fg-subtle">
                  The requested product does not exist in the current mock catalog.
                </Text>
              </div>
              <Button variant="secondary" size="small" asChild>
                <Link to="/products">
                  <ArrowLeft className="h-4 w-4" />
                  Back to products
                </Link>
              </Button>
            </div>
          </div>
        </Container>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-y-6">
      <Container>
        <div className="flex flex-col gap-y-3">
          <Text size="small" className="text-ui-fg-muted uppercase tracking-wider">
            Products
          </Text>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex flex-col gap-y-1">
              <Heading level="h2">{product.title}</Heading>
              <Text size="base" className="text-ui-fg-subtle">
                Section-based editing workspace for overview, organize, descriptive fields, and
                variant-owned pricing.
              </Text>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" size="small" asChild>
                <Link to="/products">
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </Link>
              </Button>
              <Button
                variant="secondary"
                size="small"
                disabled={isSubmittingMedia}
                onClick={() => void save("draft")}
              >
                <Save className="h-4 w-4" />
                {isSubmittingMedia ? "Uploading media..." : "Save changes"}
              </Button>
              <Button
                variant="primary"
                size="small"
                disabled={isSubmittingMedia}
                onClick={() => void save("publish")}
              >
                <Send className="h-4 w-4" />
                {isSubmittingMedia ? "Uploading media..." : "Publish"}
              </Button>
            </div>
          </div>
        </div>
      </Container>

      {errors.form ? <InlineError message={errors.form} /> : null}
      {errors.publish ? <InlineError message={errors.publish} /> : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex flex-col gap-y-6">
          <ProductDetailOverview state={state} />
          <ProductDetailOrganize state={state} />
          <ProductDetailAttributes state={state} />
          <ProductDetailVariants state={state} />
        </div>

        <ProductDetailAside state={state} />
      </div>

      <VariantGallery state={state} />
    </div>
  );
}
