import { Badge, Button, Container, Heading, Text } from "@medusajs/ui";
import { ExternalLink, Loader2, Package, Trash2, Upload } from "lucide-react";
import { TextField } from "../../components/ui/medusa";
import { InlineError } from "../../components/ui/medusa/inline-error";
import { formatCurrency } from "../../lib/utils";
import type { useProductDetail } from "./use-product-detail";

type ProductDetailVariantsProps = {
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

export function ProductDetailVariants({ state }: ProductDetailVariantsProps) {
  const {
    product,
    values,
    errors,
    effectiveVariantRows,
    processingVariantKeys,
    fileInputRefs,
    variantMediaError,
    setValue,
    buildVariantSignature,
    handleVariantMediaUpload,
    handleDeleteVariantMedia,
    openVariantGallery,
  } = state;

  return (
    <Container>
      <div className="flex flex-col gap-y-3">
        <div className="flex flex-col gap-y-1">
          <Heading level="h3">
            <Package className="-ml-1 mr-1 inline h-4 w-4 text-ui-fg-muted" />
            Variants and pricing
          </Heading>
          <Text size="small" className="text-ui-fg-subtle">
            Variant prices remain owned by variants. Edit option structure through preview inputs.
          </Text>
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          <TextField
            label="Base price"
            name="detail-base-price"
            type="number"
            value={values.basePrice}
            error={errors.basePrice}
            onChange={(value) => setValue("basePrice", value)}
          />
          <TextField
            label="Inventory"
            name="detail-inventory"
            type="number"
            value={values.inventory}
            onChange={(value) => setValue("inventory", value)}
          />
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          <TextField
            label="Option one"
            name="detail-option-one"
            value={values.optionNameOne}
            error={errors.optionNameOne}
            onChange={(value) => setValue("optionNameOne", value)}
          />
          <TextField
            label="Option values"
            name="detail-option-values-one"
            value={values.optionValuesOne}
            error={errors.optionValuesOne}
            onChange={(value) => setValue("optionValuesOne", value)}
          />
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          <TextField
            label="Option two"
            name="detail-option-two"
            value={values.optionNameTwo}
            error={errors.optionNameTwo}
            onChange={(value) => setValue("optionNameTwo", value)}
          />
          <TextField
            label="Option values"
            name="detail-option-values-two"
            value={values.optionValuesTwo}
            error={errors.optionValuesTwo}
            onChange={(value) => setValue("optionValuesTwo", value)}
          />
        </div>
        {errors.variants ? (
          <Text size="small" className="text-ui-fg-error">
            {errors.variants}
          </Text>
        ) : null}

        {variantMediaError ? <InlineError message={variantMediaError} /> : null}

        <div className="rounded-lg border border-ui-border-base bg-ui-bg-subtle p-5">
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-y-1">
              <Text size="small" className="text-ui-fg-base font-medium">
                Variant preview
              </Text>
              <Text size="xsmall" className="text-ui-fg-muted">
                Current detail edits generate the following sellable combinations.
              </Text>
            </div>
            {product && (
              <Badge color={getBadgeColor(product.status)} size="xsmall" rounded="full">
                {product.status}
              </Badge>
            )}
          </div>
          <div className="mt-4 flex flex-col gap-y-4">
            {effectiveVariantRows.map((variant) => {
              const variantSignature = buildVariantSignature(variant.options);
              const isUploading = processingVariantKeys.includes(variantSignature);

              return (
                <div
                  key={variantSignature}
                  className="rounded-lg border border-ui-border-base bg-ui-bg-base px-4 py-3"
                >
                  <div className="flex items-center justify-between gap-4">
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
                        {formatCurrency(variant.price)}
                      </Text>
                      <Text size="small" className="text-ui-fg-muted">
                        {variant.inventory} in stock
                      </Text>
                    </div>
                  </div>

                  <div className="mt-3">
                    <input
                      ref={(element) => {
                        fileInputRefs.current[variantSignature] = element;
                      }}
                      type="file"
                      accept="image/png,image/jpeg,application/pdf"
                      multiple
                      className="hidden"
                      onChange={(event) => {
                        void handleVariantMediaUpload(variantSignature, event.target.files);
                        event.target.value = "";
                      }}
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      size="small"
                      disabled={isUploading}
                      onClick={() => fileInputRefs.current[variantSignature]?.click()}
                    >
                      {isUploading ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Upload className="size-4" />
                      )}
                      {isUploading ? "Uploading..." : "Upload media"}
                    </Button>
                  </div>

                  {variant.media.length > 0 ? (
                    <div className="mt-3 grid grid-cols-4 gap-3 sm:grid-cols-6">
                      {variant.media.map((asset) => (
                        <div
                          key={asset.id}
                          className="overflow-hidden rounded-lg border border-ui-border-base"
                        >
                          <button
                            type="button"
                            className="block w-full bg-ui-bg-subtle"
                            onClick={() =>
                              openVariantGallery(
                                variant.title,
                                variant.media,
                                variant.media.findIndex((item) => item.id === asset.id),
                              )
                            }
                          >
                            <img
                              src={asset.contentUrl}
                              alt={asset.fileName}
                              className="h-20 w-full object-cover"
                            />
                          </button>
                          <div className="space-y-1.5 px-2 py-2">
                            <Text size="xsmall" weight="plus" className="line-clamp-1">
                              {asset.fileName}
                            </Text>
                            <Text size="xsmall" className="text-ui-fg-subtle">
                              {asset.widthPx}x{asset.heightPx}
                            </Text>
                            <div className="flex gap-1.5">
                              <button
                                type="button"
                                className="inline-flex items-center gap-1 rounded-md border border-ui-border-base px-1.5 py-1 text-xs font-medium text-ui-fg-base"
                                onClick={() =>
                                  openVariantGallery(
                                    variant.title,
                                    variant.media,
                                    variant.media.findIndex((item) => item.id === asset.id),
                                  )
                                }
                              >
                                <ExternalLink className="size-3" />
                                Preview
                              </button>
                              <button
                                type="button"
                                className="inline-flex items-center gap-1 rounded-md border border-ui-border-base px-1.5 py-1 text-xs font-medium text-ui-fg-error"
                                onClick={() => {
                                  handleDeleteVariantMedia(variantSignature, asset.id);
                                }}
                              >
                                <Trash2 className="size-3" />
                                Delete
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Container>
  );
}
