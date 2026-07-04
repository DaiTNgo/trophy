import { Link } from "react-router";
import { Button, Container, Heading, Text, StatusBadge } from "@medusajs/ui";
import { ArrowLeft } from "lucide-react";

import { useProductDetail } from "./product-detail/use-product-detail";
import { ProductDetailOverview } from "./product-detail/product-detail-overview";
import { ProductDetailOrganize } from "./product-detail/product-detail-organize";
import { ProductDetailAttributes } from "./product-detail/product-detail-attributes";
import { ProductDetailVariants } from "./product-detail/product-detail-variants";
import { ProductDetailCustomization } from "./product-detail/product-detail-customization";
import { ProductDetailAside } from "./product-detail/product-detail-aside";
import { ProductDetailThumbnail } from "./product-detail/product-detail-thumbnail";

export function ProductDetailPage() {
  const { product, isLoading, error, mutate } = useProductDetail();

  if (isLoading) {
    return (
      <div className="flex flex-col gap-y-6">
        <Container>
          <div className="flex items-center justify-center py-8">
            <Text size="small" className="text-ui-fg-muted">
              Loading product...
            </Text>
          </div>
        </Container>
      </div>
    );
  }

  if (error || !product) {
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
                  {error || "The requested product does not exist."}
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
          <div className="flex items-center gap-x-2">
            <Text size="small" className="text-ui-fg-muted uppercase tracking-wider">
              Products
            </Text>
            <Text size="small" className="text-ui-fg-muted">
              /
            </Text>
            <StatusBadge color={product.status === "Published" ? "green" : "grey"}>
              {product.status}
            </StatusBadge>
          </div>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex flex-col gap-y-1">
              <Heading level="h2">{product.title}</Heading>
              <Text size="base" className="text-ui-fg-subtle">
                Manage product details, variants, and customization settings.
              </Text>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" size="small" asChild>
                <Link to="/products">
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </Container>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex flex-col gap-y-6">
          <ProductDetailOverview product={product} mutate={mutate} />
          <ProductDetailThumbnail product={product} mutate={mutate} />
          <ProductDetailVariants product={product} mutate={mutate} />
          <ProductDetailAttributes product={product} mutate={mutate} />
          <ProductDetailCustomization product={product} mutate={mutate} />
        </div>

        <div className="flex flex-col gap-y-6">
          <ProductDetailAside product={product} mutate={mutate} />
          <ProductDetailOrganize product={product} mutate={mutate} />
        </div>
      </div>
    </div>
  );
}
