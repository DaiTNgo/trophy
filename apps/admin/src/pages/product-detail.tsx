import { useEffect } from "react";
import { Link } from "react-router";
import { Button, Container, Heading, Text } from "@medusajs/ui";
import { ArrowLeft } from "lucide-react";

import { useProductDetail } from "./product-detail/use-product-detail";
import { useBreadcrumbs } from "../hooks/use-breadcrumbs";
import { ProductDetailOverview } from "./product-detail/product-detail-overview";
import { ProductDetailOrganize } from "./product-detail/product-detail-organize";
import { ProductDetailAttributes } from "./product-detail/product-detail-attributes";
import { ProductDetailOptions } from "./product-detail/product-detail-options";
import { ProductDetailVariants } from "./product-detail/product-detail-variants";
import { ProductDetailCustomization } from "./product-detail/product-detail-customization";
import { ProductDetailThumbnail } from "./product-detail/product-detail-thumbnail";

export function ProductDetailPage() {
  const { product, isLoading, error, mutate } = useProductDetail();
  const { setBreadcrumbs } = useBreadcrumbs();

  useEffect(() => {
    if (product) {
      setBreadcrumbs([
        { label: "Products", path: "/products" },
        { label: product.title }
      ]);
    }
    return () => setBreadcrumbs([]);
  }, [product, setBreadcrumbs]);

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
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex flex-col gap-y-6">
          <ProductDetailOverview product={product} mutate={mutate} />
          <ProductDetailThumbnail product={product} mutate={mutate} />
          <ProductDetailOptions product={product} mutate={mutate} />
          <ProductDetailVariants product={product} mutate={mutate} />
          <ProductDetailCustomization product={product} mutate={mutate} />
        </div>

        <div className="flex flex-col gap-y-6">
          <ProductDetailOrganize product={product} mutate={mutate} />
          <ProductDetailAttributes product={product} mutate={mutate} />
        </div>
      </div>
    </div>
  );
}
