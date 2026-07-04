import { useState, useRef } from "react";
import { Badge, Button, Container, Heading, Text, Drawer, IconButton } from "@medusajs/ui";
import { Package, Edit, Upload, Trash } from "lucide-react";
import { TextField } from "../../components/ui/medusa";
import { InlineError } from "../../components/ui/medusa/inline-error";
import { formatCurrency } from "../../lib/utils";
import type { CatalogProduct } from "../../types";
import { updateProductOptions, updateProductVariants } from "../../lib/products-client";
import { uploadProductVariantMedia } from "../../lib/product-assets-client";
import { AdminMedia } from "../../components/ui/admin-media";

type ProductDetailVariantsProps = {
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

export function ProductDetailVariants({ product, mutate }: ProductDetailVariantsProps) {
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [variantsOpen, setVariantsOpen] = useState(false);
  const fileInputRefs = useRef<Record<number, HTMLInputElement | null>>({});
  
  // Options State
  const [options, setOptions] = useState<{ title: string; values: string }[]>([]);
  const [isSubmittingOptions, setIsSubmittingOptions] = useState(false);
  const [optionsError, setOptionsError] = useState<string | null>(null);

  // Variants State
  const [variantsState, setVariantsState] = useState<{
    id: number;
    title: string;
    sku: string;
    priceAmount: number | null;
    optionValueIds: number[];
    media: { assetId: string; url: string; mimeType: string }[];
    isUploading?: boolean;
  }[]>([]);
  const [isSubmittingVariants, setIsSubmittingVariants] = useState(false);
  const [variantsError, setVariantsError] = useState<string | null>(null);

  const handleOptionsOpen = (isOpen: boolean) => {
    if (isOpen) {
      setOptions(
        product.optionDefinitions.map(opt => ({
          title: opt.title,
          values: opt.values.map(v => v.value).join(", ")
        }))
      );
      setOptionsError(null);
    }
    setOptionsOpen(isOpen);
  };

  const handleVariantsOpen = (isOpen: boolean) => {
    if (isOpen) {
      setVariantsState(
        product.variants.map(v => ({
          id: Number(v.id),
          title: v.title,
          sku: v.sku,
          priceAmount: v.price,
          optionValueIds: v.options.map(o => o.optionValueId!).filter(Boolean),
          media: v.media?.map(m => ({ assetId: m.id, url: m.contentUrl, mimeType: m.mimeType })) || [],
          isUploading: false,
        }))
      );
      setVariantsError(null);
    }
    setVariantsOpen(isOpen);
  };

  const saveOptions = async () => {
    setIsSubmittingOptions(true);
    setOptionsError(null);
    try {
      const items = options.filter(o => o.title.trim() && o.values.trim()).map(o => ({
        title: o.title.trim(),
        values: o.values.split(",").map(v => v.trim()).filter(Boolean)
      }));
      await updateProductOptions(product.id, items);
      await mutate();
      setOptionsOpen(false);
    } catch (err) {
      setOptionsError(err instanceof Error ? err.message : "Failed to update options");
    } finally {
      setIsSubmittingOptions(false);
    }
  };

  const saveVariants = async () => {
    setIsSubmittingVariants(true);
    setVariantsError(null);
    try {
      const items = variantsState.map(v => ({
        id: v.id,
        title: v.title,
        sku: v.sku || null,
        priceAmount: v.priceAmount,
        optionValueIds: v.optionValueIds,
        media: v.media.map(m => ({ assetId: m.assetId }))
      }));
      await updateProductVariants(product.id, items);
      await mutate();
      setVariantsOpen(false);
    } catch (err) {
      setVariantsError(err instanceof Error ? err.message : "Failed to update variants");
    } finally {
      setIsSubmittingVariants(false);
    }
  };

  const updateVariantState = (index: number, field: "priceAmount" | "sku", value: string) => {
    const newVariants = [...variantsState];
    if (field === "priceAmount") {
      newVariants[index].priceAmount = value === "" ? null : Number(value);
    } else {
      newVariants[index][field] = value;
    }
    setVariantsState(newVariants);
  };

  const handleFileUpload = async (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const newVariants = [...variantsState];
    newVariants[index].isUploading = true;
    setVariantsState(newVariants);
    setVariantsError(null);

    try {
      // Use existing endpoint which handles PDF to Image conversion automatically
      const media = await uploadProductVariantMedia(file);
      
      const latestVariants = [...variantsState];
      latestVariants[index].media = [{ assetId: media.id, url: media.contentUrl, mimeType: media.mimeType }];
      latestVariants[index].isUploading = false;
      setVariantsState(latestVariants);
    } catch (err) {
      const errorVariants = [...variantsState];
      errorVariants[index].isUploading = false;
      setVariantsState(errorVariants);
      setVariantsError(err instanceof Error ? err.message : "Failed to upload media");
    }
  };

  const removeMedia = (index: number) => {
    const newVariants = [...variantsState];
    newVariants[index].media = [];
    setVariantsState(newVariants);
  };

  return (
    <Container>
      <div className="flex flex-col gap-y-3">
        <div className="flex items-start justify-between">
          <div className="flex flex-col gap-y-1">
            <Heading level="h3">
              <Package className="-ml-1 mr-1 inline h-4 w-4 text-ui-fg-muted" />
              Variants and pricing
            </Heading>
            <Text size="small" className="text-ui-fg-subtle">
              Manage option definitions and variant-owned prices.
            </Text>
          </div>
          <div className="flex gap-2">
            <Drawer open={optionsOpen} onOpenChange={handleOptionsOpen}>
              <Drawer.Trigger asChild>
                <Button variant="secondary" size="small">
                  <Edit className="h-4 w-4" />
                  Edit Options
                </Button>
              </Drawer.Trigger>
              <Drawer.Content>
                <Drawer.Header>
                  <Drawer.Title>Edit Options</Drawer.Title>
                </Drawer.Header>
                <Drawer.Body className="flex flex-col gap-y-6">
                  {optionsError && <InlineError message={optionsError} />}
                  <Text size="small" className="text-ui-fg-subtle">
                    Define up to 3 options. Values should be comma-separated. Warning: changing options will regenerate all variants!
                  </Text>
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="flex flex-col gap-y-3">
                      <TextField
                        label={`Option ${i + 1} Name`}
                        name={`optionName${i}`}
                        value={options[i]?.title || ""}
                        onChange={(val) => {
                          const newOpts = [...options];
                          if (!newOpts[i]) newOpts[i] = { title: "", values: "" };
                          newOpts[i].title = val;
                          setOptions(newOpts);
                        }}
                      />
                      <TextField
                        label={`Option ${i + 1} Values (comma separated)`}
                        name={`optionValues${i}`}
                        value={options[i]?.values || ""}
                        onChange={(val) => {
                          const newOpts = [...options];
                          if (!newOpts[i]) newOpts[i] = { title: "", values: "" };
                          newOpts[i].values = val;
                          setOptions(newOpts);
                        }}
                      />
                    </div>
                  ))}
                </Drawer.Body>
                <Drawer.Footer>
                  <Drawer.Close asChild>
                    <Button variant="secondary" disabled={isSubmittingOptions}>Cancel</Button>
                  </Drawer.Close>
                  <Button onClick={() => void saveOptions()} isLoading={isSubmittingOptions}>
                    Save Options
                  </Button>
                </Drawer.Footer>
              </Drawer.Content>
            </Drawer>

            <Drawer open={variantsOpen} onOpenChange={handleVariantsOpen}>
              <Drawer.Trigger asChild>
                <Button variant="secondary" size="small">
                  <Edit className="h-4 w-4" />
                  Edit Variants
                </Button>
              </Drawer.Trigger>
              <Drawer.Content className="max-w-xl">
                <Drawer.Header>
                  <Drawer.Title>Edit Variants</Drawer.Title>
                </Drawer.Header>
                <Drawer.Body className="flex flex-col gap-y-6 overflow-y-auto max-h-[80vh]">
                  {variantsError && <InlineError message={variantsError} />}
                  {variantsState.map((variant, index) => (
                    <div key={variant.id} className="rounded-lg border border-ui-border-base p-4 flex flex-col gap-y-4">
                      <Text size="small" className="font-medium text-ui-fg-base">{variant.title}</Text>
                      
                      <div className="flex gap-4">
                        <div className="flex flex-col items-center justify-center border border-ui-border-base border-dashed rounded-md w-24 h-24 bg-ui-bg-subtle relative overflow-hidden shrink-0">
                          {variant.media.length > 0 ? (
                            <>
                              <AdminMedia src={variant.media[0].url} mimeType={variant.media[0].mimeType} alt="Variant media" className="w-full h-full object-cover" />
                              <IconButton 
                                size="small" 
                                variant="transparent" 
                                className="absolute top-1 right-1 bg-white/80 hover:bg-white text-ui-fg-base"
                                onClick={() => removeMedia(index)}
                              >
                                <Trash className="w-3 h-3 text-ui-fg-error" />
                              </IconButton>
                            </>
                          ) : (
                            <div className="flex flex-col items-center justify-center gap-1">
                              <IconButton
                                size="small"
                                variant="transparent"
                                isLoading={variant.isUploading}
                                onClick={() => fileInputRefs.current[index]?.click()}
                              >
                                <Upload className="w-4 h-4" />
                              </IconButton>
                              <Text size="xsmall" className="text-ui-fg-muted">Upload</Text>
                            </div>
                          )}
                          <input 
                            type="file" 
                            className="hidden" 
                            accept="image/*,application/pdf"
                            ref={(el) => { fileInputRefs.current[index] = el; }}
                            onChange={(e) => void handleFileUpload(index, e)}
                          />
                        </div>
                        
                        <div className="flex-1 grid grid-cols-2 gap-3">
                          <TextField
                            label="Price"
                            name={`price${index}`}
                            type="number"
                            value={variant.priceAmount === null ? "" : String(variant.priceAmount)}
                            onChange={(val) => updateVariantState(index, "priceAmount", val)}
                          />
                          <TextField
                            label="SKU"
                            name={`sku${index}`}
                            value={variant.sku || ""}
                            onChange={(val) => updateVariantState(index, "sku", val)}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </Drawer.Body>
                <Drawer.Footer>
                  <Drawer.Close asChild>
                    <Button variant="secondary" disabled={isSubmittingVariants}>Cancel</Button>
                  </Drawer.Close>
                  <Button onClick={() => void saveVariants()} isLoading={isSubmittingVariants}>
                    Save Variants
                  </Button>
                </Drawer.Footer>
              </Drawer.Content>
            </Drawer>
          </div>
        </div>

        <div className="rounded-lg border border-ui-border-base bg-ui-bg-subtle p-5 mt-4">
          <div className="flex items-center justify-between">
            <Text size="small" className="text-ui-fg-base font-medium">
              Variants List
            </Text>
            {product && (
              <Badge color={getBadgeColor(product.status)} size="xsmall" rounded="full">
                {product.status}
              </Badge>
            )}
          </div>
          <div className="mt-4 flex flex-col gap-y-4">
            {product.variants.length === 0 ? (
               <Text size="small" className="text-ui-fg-muted">No variants generated.</Text>
            ) : null}
            {product.variants.map((variant) => (
              <div
                key={variant.id}
                className="rounded-lg border border-ui-border-base bg-ui-bg-base px-4 py-3"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded bg-ui-bg-subtle border border-ui-border-base flex items-center justify-center overflow-hidden shrink-0">
                    {variant.media && variant.media.length > 0 ? (
                      <AdminMedia src={variant.media[0].contentUrl} mimeType={variant.media[0].mimeType} alt={variant.title} className="w-full h-full object-cover" />
                    ) : (
                      <Package className="w-5 h-5 text-ui-fg-muted" />
                    )}
                  </div>
                  <div className="flex-1 flex items-center justify-between gap-4">
                    <div className="flex flex-col gap-y-0.5">
                      <Text size="small" className="text-ui-fg-base font-medium">
                        {variant.title}
                      </Text>
                      <Text size="xsmall" className="text-ui-fg-muted">
                        {variant.options.length > 0
                          ? variant.options.map((option) => `${option.option}: ${option.value}`).join(" • ")
                          : "No option selections"}
                      </Text>
                    </div>
                    <div className="flex items-center gap-3">
                      <Text size="small" className="text-ui-fg-muted">
                        {variant.price !== null ? formatCurrency(variant.price) : "No price"}
                      </Text>
                      <Text size="small" className="text-ui-fg-muted">
                        {variant.inventory} in stock
                      </Text>
                      <Text size="small" className="text-ui-fg-muted font-mono">
                        {variant.sku || "No SKU"}
                      </Text>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Container>
  );
}
