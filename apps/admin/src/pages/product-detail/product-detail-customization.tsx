import { useState } from "react";
import { Link } from "react-router";
import { Badge, Button, Container, Heading, Text } from "@medusajs/ui";
import { Play, Trash2 } from "lucide-react";
import { updateProductCustomization } from "../../lib/products-client";
import type { CatalogProduct } from "../../types";
import { InlineError } from "../../components/ui/medusa/inline-error";

type ProductDetailCustomizationProps = {
  product: CatalogProduct;
  mutate: () => Promise<void>;
};

export function ProductDetailCustomization({ product, mutate }: ProductDetailCustomizationProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const customization = product.customization;

  const handleEnable = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      await updateProductCustomization(product.id, {
        enabled: true,
        layers: [], // Backend handles default generation or accepts empty for now
        formFields: []
      });
      await mutate();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to enable customization");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDisable = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      await updateProductCustomization(product.id, {
        enabled: false
      });
      await mutate();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to disable customization");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Container className="p-0 overflow-hidden">
      <div className="flex flex-col">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex flex-col gap-y-1">
            <Heading level="h2" className="text-xl font-semibold">
              Customization
            </Heading>
            <Text size="small" className="text-ui-fg-subtle">
              Enable shopper personalization. Define layers, constraints, and dynamic inputs.
            </Text>
          </div>
          <div className="flex gap-2">
            {!customization?.enabled ? (
              <Button variant="secondary" size="small" onClick={() => void handleEnable()} isLoading={isSubmitting}>
                Enable Customization
              </Button>
            ) : (
              <Button variant="secondary" size="small" onClick={() => void handleDisable()} isLoading={isSubmitting}>
                <Trash2 className="mr-1 h-4 w-4 text-ui-fg-error" />
                Disable
              </Button>
            )}
          </div>
        </div>

        {error && <InlineError message={error} />}

        {customization?.enabled && (
          <div className="border-t border-ui-border-base px-6 py-4">
            <div className="rounded-lg border border-ui-border-base bg-ui-bg-subtle p-5">
              <div className="flex items-center justify-between">
                <div className="flex flex-col gap-y-1">
                  <Text size="small" className="text-ui-fg-base font-medium">
                    Customization Editor
                  </Text>
                  <Text size="xsmall" className="text-ui-fg-muted">
                    Design the layout and inputs for this product.
                  </Text>
                </div>
                <Badge color="green" size="xsmall" rounded="full">
                  Enabled
                </Badge>
              </div>
              
              <div className="mt-4 grid gap-4 grid-cols-2 md:grid-cols-4">
                <div className="flex flex-col">
                  <Text size="xsmall" className="text-ui-fg-muted">Canvas size</Text>
                  <Text size="small" className="text-ui-fg-base">
                    {customization.canvasWidthPx && customization.canvasHeightPx 
                      ? `${customization.canvasWidthPx}x${customization.canvasHeightPx}`
                      : "Not set"}
                  </Text>
                </div>
                <div className="flex flex-col">
                  <Text size="xsmall" className="text-ui-fg-muted">Layers</Text>
                  <Text size="small" className="text-ui-fg-base">{customization.layerCount}</Text>
                </div>
                <div className="flex flex-col">
                  <Text size="xsmall" className="text-ui-fg-muted">Form fields</Text>
                  <Text size="small" className="text-ui-fg-base">{customization.formFieldCount}</Text>
                </div>
                <div className="flex items-center justify-end">
                  <Button variant="secondary" size="small" asChild>
                    <Link to={`/products/${product.id}/customization`}>
                      <Play className="h-4 w-4" />
                      Open Editor
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Container>
  );
}
