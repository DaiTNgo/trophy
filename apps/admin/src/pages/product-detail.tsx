import { useEffect, useMemo, useState, useRef, startTransition } from "react";
import { Link, useNavigate, useParams } from "react-router";
import {
  Badge,
  Button,
  Container,
  Heading,
  IconButton,
  Text,
} from "@medusajs/ui";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Image,
  Loader2,
  Package,
  Plus,
  Save,
  Send,
  Tags,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { uploadProductVariantMedia } from "../lib/product-assets-client";
import { TextField } from "../components/ui/medusa";
import { TextAreaField } from "../components/ui/medusa/text-area-field";
import { SelectField } from "../components/ui/medusa/select-field";
import { CategoryMultiSelect } from "../components/ui/medusa/category-multiselect";
import { InlineError } from "../components/ui/medusa/inline-error";
import { ChecklistItem } from "../components/ui/medusa";
import { useCatalog } from "../hooks/use-catalog";
import {
  collectionOptions,
  categoryOptions,
  typeOptions,
} from "../lib/mock-data";
import {
  buildVariantPreview,
  buildUpdatedProduct,
  isPublishReady,
  productToFormValues,
  reconcileVariantRows,
  validateCreateProduct,
} from "../lib/product-utils";
import { derivePublishedStatus } from "../lib/product-utils";
import { formatCurrency } from "../lib/utils";
import type {
  CreateProductFormValues,
  CreateProductErrors,
  CreateProductSubmission,
  ProductAttribute,
  ProductVariant,
  ProductVariantMedia,
  VariantOptionValue,
} from "../types";

const defaultCreateProductValues: CreateProductFormValues = {
  title: "",
  handle: "",
  subtitle: "",
  description: "",
  type: "",
  collection: "",
  categories: [],
  tags: "",
  media: "",
  hasVariants: false,
  basePrice: "",
  inventory: "",
  optionNameOne: "",
  optionValuesOne: "",
  optionNameTwo: "",
  optionValuesTwo: "",
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

export function ProductDetailPage() {
  const { productId } = useParams();
  const { products, updateProduct } = useCatalog();
  const navigate = useNavigate();
  const product = products.find((entry) => entry.id === productId);
  const [errors, setErrors] = useState<CreateProductErrors>({});
  const [variantRows, setVariantRows] = useState<ProductVariant[]>(() =>
    product ? product.variants : [],
  );
  const [variantMediaError, setVariantMediaError] = useState<string | null>(null);
  const [processingVariantKeys, setProcessingVariantKeys] = useState<string[]>([]);
  const [isSubmittingMedia, setIsSubmittingMedia] = useState(false);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const [variantGallery, setVariantGallery] = useState<{
    title: string;
    assets: ProductVariantMedia[];
    activeIndex: number;
  } | null>(null);

  const [values, setValues] = useState<CreateProductFormValues>(() =>
    product ? productToFormValues(product) : defaultCreateProductValues,
  );
  const [attributes, setAttributes] = useState<ProductAttribute[]>(() =>
    product && product.attributes.length > 0 ? product.attributes : [{ key: "", value: "" }],
  );

  useEffect(() => {
    if (!product) return;

    setValues(productToFormValues(product));
    setVariantRows(product.variants);
    setAttributes(product.attributes.length > 0 ? product.attributes : [{ key: "", value: "" }]);
  }, [product]);

  useEffect(() => {
    setVariantRows((current) => reconcileVariantRows(current, values));
  }, [values.hasVariants, values.inventory, values.optionNameOne, values.optionValuesOne, values.optionNameTwo, values.optionValuesTwo]);

  useEffect(() => {
    return () => {
      variantRows.forEach((variant) => {
        variant.media.forEach((asset) => {
          if (asset.isPending) {
            URL.revokeObjectURL(asset.contentUrl);
          }
        });
      });
    };
  }, [variantRows]);

  useEffect(() => {
    if (!variantGallery) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopPropagation();
        closeVariantGallery();
      }
    }

    document.addEventListener("keydown", handleKeyDown, true);
    return () => document.removeEventListener("keydown", handleKeyDown, true);
  }, [variantGallery]);

  const variantPreview = useMemo(() => buildVariantPreview(values), [values]);
  const effectiveVariantRows = useMemo(
    () => reconcileVariantRows(variantRows, values),
    [values, variantRows],
  );
  const publishReady = isPublishReady(values, variantPreview);

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

  const currentProduct = product;

  function setValue<K extends keyof CreateProductFormValues>(key: K, nextValue: CreateProductFormValues[K]) {
    setValues((current) => ({ ...current, [key]: nextValue }));
  }

  function updateAttribute(index: number, key: keyof ProductAttribute, nextValue: string) {
    setAttributes((current) =>
      current.map((attribute, currentIndex) =>
        currentIndex === index ? { ...attribute, [key]: nextValue } : attribute,
      ),
    );
  }

  function addAttributeRow() {
    setAttributes((current) => [...current, { key: "", value: "" }]);
  }

  function removeAttributeRow(index: number) {
    setAttributes((current) => current.filter((_, currentIndex) => currentIndex !== index));
  }

  function buildVariantSignature(options: VariantOptionValue[]) {
    if (options.length === 0) return "__default__";
    return options.map((option) => `${option.option}:${option.value}`).join("|");
  }

  function updateVariantMedia(
    variantSignature: string,
    updater: (currentMedia: ProductVariantMedia[]) => ProductVariantMedia[],
  ) {
    setVariantRows((current) =>
      current.map((variant) =>
        buildVariantSignature(variant.options) === variantSignature
          ? { ...variant, media: updater(variant.media) }
          : variant,
      ),
    );
  }

  async function handleVariantMediaUpload(
    variantSignature: string,
    files: FileList | null,
  ) {
    if (!files || files.length === 0) return;

    setVariantMediaError(null);
    setProcessingVariantKeys((current) => [...current, variantSignature]);

    try {
      const stagedAssets = await Promise.all(
        Array.from(files).map(async (file) => {
          if (!["image/png", "image/jpeg"].includes(file.type)) {
            throw new Error("Only PNG and JPEG product assets are supported.");
          }

          const objectUrl = URL.createObjectURL(file);
          const dimensions = await new Promise<{
            width: number;
            height: number;
          }>((resolve, reject) => {
            const imgEl = document.createElement("img");
            imgEl.onload = () => {
              resolve({ width: imgEl.naturalWidth, height: imgEl.naturalHeight });
            };
            imgEl.onerror = () => {
              reject(new Error("Image data is invalid or unsupported."));
            };
            imgEl.src = objectUrl;
          });

          return {
            id: `pending_${crypto.randomUUID()}`,
            fileName: file.name,
            mimeType: file.type,
            widthPx: dimensions.width,
            heightPx: dimensions.height,
            byteSize: file.size,
            contentUrl: objectUrl,
            file,
            isPending: true,
          } satisfies ProductVariantMedia;
        }),
      );
      updateVariantMedia(variantSignature, (currentMedia) => [
        ...currentMedia,
        ...stagedAssets,
      ]);
    } catch (error) {
      setVariantMediaError(
        error instanceof Error
          ? error.message
          : "Unable to upload variant media.",
      );
    } finally {
      setProcessingVariantKeys((current) =>
        current.filter((key) => key !== variantSignature),
      );
    }
  }

  function handleDeleteVariantMedia(variantSignature: string, assetId: string) {
    setVariantMediaError(null);
    updateVariantMedia(variantSignature, (currentMedia) => {
      const target = currentMedia.find((asset) => asset.id === assetId);
      if (target?.isPending) {
        URL.revokeObjectURL(target.contentUrl);
      }
      return currentMedia.filter((asset) => asset.id !== assetId);
    });
  }

  function openVariantGallery(
    title: string,
    assets: ProductVariantMedia[],
    activeIndex: number,
  ) {
    if (assets.length === 0) return;
    setVariantGallery({
      title,
      assets,
      activeIndex: activeIndex < 0 ? 0 : activeIndex,
    });
  }

  function closeVariantGallery() {
    setVariantGallery(null);
  }

  function showPreviousGalleryAsset() {
    setVariantGallery((current) => {
      if (!current) return current;
      return {
        ...current,
        activeIndex:
          current.activeIndex === 0
            ? current.assets.length - 1
            : current.activeIndex - 1,
      };
    });
  }

  function showNextGalleryAsset() {
    setVariantGallery((current) => {
      if (!current) return current;
      return {
        ...current,
        activeIndex:
          current.activeIndex === current.assets.length - 1
            ? 0
            : current.activeIndex + 1,
      };
    });
  }

  async function save(mode: "draft" | "publish") {
    const nextErrors = validateCreateProduct({
      mode,
      values,
      attributes,
      products: products.filter((entry) => entry.id !== currentProduct.id),
      variantRows: effectiveVariantRows,
    });

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setVariantMediaError(null);
    setIsSubmittingMedia(true);

    try {
      const variantRowsWithUploadedMedia = await Promise.all(
        effectiveVariantRows.map(async (variant) => {
          const uploadedMedia = await Promise.all(
            variant.media.map(async (media) => {
              if (!media.isPending || !media.file) {
                const { file: _, ...rest } = media;
                return rest;
              }
              const uploaded = await uploadProductVariantMedia(media.file);
              return uploaded;
            }),
          );
          return { ...variant, media: uploadedMedia };
        }),
      );

      const submission: CreateProductSubmission = {
        mode,
        values,
        attributes,
        variantRows: variantRowsWithUploadedMedia,
      };

      const updated = updateProduct(currentProduct.id, (current) =>
        buildUpdatedProduct(current, submission),
      );

      if (!updated) {
        setErrors({ form: "Unable to save the current product." });
        return;
      }

      setErrors({});
      startTransition(() => {
        navigate("/products", {
          replace: true,
          state: {
            flash: `${updated.title} was updated as ${mode === "publish" ? updated.status.toLowerCase() : "draft"}.`,
          },
        });
      });
    } catch (error) {
      setVariantMediaError(
        error instanceof Error
          ? error.message
          : "Unable to upload variant media during save.",
      );
    } finally {
      setIsSubmittingMedia(false);
    }
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
              <Heading level="h2">{currentProduct.title}</Heading>
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
          <Container>
            <div className="flex flex-col gap-y-3">
              <div className="flex flex-col gap-y-1">
                <Heading level="h3">Overview</Heading>
                <Text size="small" className="text-ui-fg-subtle">
                  Edit the core identity and descriptive content shown for this product.
                </Text>
              </div>
              <div className="grid gap-5 md:grid-cols-2">
                <TextField
                  label="Title"
                  name="detail-title"
                  value={values.title}
                  error={errors.title}
                  onChange={(value) => setValue("title", value)}
                />
                <TextField
                  label="Handle"
                  name="detail-handle"
                  value={values.handle}
                  error={errors.handle}
                  onChange={(value) => setValue("handle", value)}
                />
              </div>
              <div className="grid gap-5 md:grid-cols-2">
                <TextField
                  label="Subtitle"
                  name="detail-subtitle"
                  value={values.subtitle}
                  onChange={(value) => setValue("subtitle", value)}
                />
                <TextField
                  label="Type"
                  name="detail-type"
                  value={values.type}
                  list="product-types"
                  onChange={(value) => setValue("type", value)}
                />
              </div>
              <TextAreaField
                label="Description"
                name="detail-description"
                value={values.description}
                onChange={(value) => setValue("description", value)}
              />
            </div>
          </Container>

          <Container>
            <div className="flex flex-col gap-y-3">
              <div className="flex flex-col gap-y-1">
                <Heading level="h3">
                  <Tags className="-ml-1 mr-1 inline h-4 w-4 text-ui-fg-muted" />
                  Organize
                </Heading>
                <Text size="small" className="text-ui-fg-subtle">
                  Control collection placement, category assignment, and tags.
                </Text>
              </div>
              <div className="grid gap-5 md:grid-cols-2">
                <SelectField
                  label="Collection"
                  value={values.collection}
                  options={collectionOptions}
                  onChange={(value) => setValue("collection", value)}
                />
                <TextField
                  label="Tags"
                  name="detail-tags"
                  value={values.tags}
                  hint="Comma separated."
                  onChange={(value) => setValue("tags", value)}
                />
              </div>
              <div className="flex flex-col gap-y-2">
                <Text size="small" className="text-ui-fg-subtle">
                  Categories
                </Text>
                <CategoryMultiSelect
                  values={values.categories}
                  options={categoryOptions}
                  onChange={(categories) => setValue("categories", categories)}
                />
              </div>
            </div>
          </Container>

          <Container>
            <div className="flex flex-col gap-y-3">
              <div className="flex flex-col gap-y-1">
                <Heading level="h3">
                  <Image className="-ml-1 mr-1 inline h-4 w-4 text-ui-fg-muted" />
                  Media and attributes
                </Heading>
                <Text size="small" className="text-ui-fg-subtle">
                  Manage product-rich content that does not affect variant combinations.
                </Text>
              </div>
              <TextAreaField
                label="Media URLs"
                name="detail-media"
                value={values.media}
                hint="One URL per line."
                onChange={(value) => setValue("media", value)}
              />
              <div className="flex flex-col gap-y-3">
                <div className="flex items-center justify-between">
                  <Text size="small" className="text-ui-fg-subtle">
                    Attributes
                  </Text>
                  <Button
                    type="button"
                    variant="secondary"
                    size="small"
                    onClick={addAttributeRow}
                  >
                    <Plus className="h-4 w-4" />
                    Add attribute
                  </Button>
                </div>
                {attributes.map((attribute, index) => (
                  <div
                    key={`${index}-${attribute.key}-${attribute.value}`}
                    className="grid gap-3 md:grid-cols-[1fr_1fr_auto]"
                  >
                    <TextField
                      label={index === 0 ? "Attribute name" : ""}
                      name={`detail-attribute-key-${index}`}
                      value={attribute.key}
                      onChange={(value) => updateAttribute(index, "key", value)}
                    />
                    <TextField
                      label={index === 0 ? "Attribute value" : ""}
                      name={`detail-attribute-value-${index}`}
                      value={attribute.value}
                      onChange={(value) => updateAttribute(index, "value", value)}
                    />
                    <div className="flex items-end">
                      <Button
                        type="button"
                        variant="secondary"
                        size="small"
                        onClick={() => removeAttributeRow(index)}
                        disabled={attributes.length === 1}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                {errors.attributes ? (
                  <Text size="small" className="text-ui-fg-error">
                    {errors.attributes}
                  </Text>
                ) : null}
              </div>
            </div>
          </Container>

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

              {variantMediaError ? (
                <InlineError message={variantMediaError} />
              ) : null}

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
                  <Badge
                    color={getBadgeColor(currentProduct.status)}
                    size="xsmall"
                    rounded="full"
                  >
                    {currentProduct.status}
                  </Badge>
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
                            accept="image/png,image/jpeg"
                            multiple
                            className="hidden"
                            onChange={(event) => {
                              void handleVariantMediaUpload(
                                variantSignature,
                                event.target.files,
                              );
                              event.target.value = "";
                            }}
                          />
                          <Button
                            type="button"
                            variant="secondary"
                            size="small"
                            disabled={isUploading}
                            onClick={() =>
                              fileInputRefs.current[variantSignature]?.click()
                            }
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
                                      variant.media.findIndex(
                                        (item) => item.id === asset.id,
                                      ),
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
                                          variant.media.findIndex(
                                            (item) => item.id === asset.id,
                                          ),
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
                                        handleDeleteVariantMedia(
                                          variantSignature,
                                          asset.id,
                                        );
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
        </div>

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
                    {values.handle.trim() || currentProduct.handle}
                  </Text>
                </div>
                <div className="flex items-center justify-between">
                  <Text size="small" className="text-ui-fg-subtle">
                    Saved status
                  </Text>
                  <Badge
                    color={getBadgeColor(currentProduct.status)}
                    size="xsmall"
                    rounded="full"
                  >
                    {currentProduct.status}
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
                    {currentProduct.updatedAt}
                  </Text>
                </div>
              </dl>
            </div>
          </Container>
        </aside>
      </div>

      <datalist id="product-types">
        {typeOptions.map((option) => (
          <option key={option} value={option} />
        ))}
      </datalist>

      {variantGallery ? (
        <div
          className="pointer-events-auto fixed inset-0 z-[80] flex items-center justify-center bg-black/75 p-6"
          onClick={(e) => { if (e.target === e.currentTarget) closeVariantGallery(); }}
        >
          <div className="relative flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl bg-white shadow-elevation-modal">
            <div className="flex items-center justify-between border-b border-ui-border-base px-5 py-4">
              <div className="min-w-0">
                <Heading level="h2">{variantGallery.title}</Heading>
                <Text size="small" className="mt-1 text-ui-fg-subtle">
                  {variantGallery.activeIndex + 1} /{" "}
                  {variantGallery.assets.length}
                </Text>
              </div>
              <IconButton type="button" onClick={closeVariantGallery}>
                <X />
              </IconButton>
            </div>

            <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_240px]">
              <div className="relative flex min-h-[420px] items-center justify-center bg-ui-bg-subtle p-6">
                <img
                  src={
                    variantGallery.assets[variantGallery.activeIndex]
                      ?.contentUrl
                  }
                  alt={
                    variantGallery.assets[variantGallery.activeIndex]?.fileName
                  }
                  className="max-h-[68vh] w-auto max-w-full object-contain"
                />

                {variantGallery.assets.length > 1 ? (
                  <>
                    <IconButton
                      type="button"
                      variant="transparent"
                      onClick={showPreviousGalleryAsset}
                      className="absolute left-4 bg-ui-bg-base shadow-elevation-card-rest hover:bg-ui-bg-base-hover"
                    >
                      <ChevronLeft />
                    </IconButton>
                    <IconButton
                      type="button"
                      variant="transparent"
                      onClick={showNextGalleryAsset}
                      className="absolute right-4 bg-ui-bg-base shadow-elevation-card-rest hover:bg-ui-bg-base-hover"
                    >
                      <ChevronRight />
                    </IconButton>
                  </>
                ) : null}
              </div>

              <div className="border-t border-ui-border-base bg-ui-bg-base p-4 lg:border-l lg:border-t-0">
                <div className="grid grid-cols-3 gap-3 lg:grid-cols-2">
                  {variantGallery.assets.map((asset, index) => (
                    <button
                      key={asset.id}
                      type="button"
                      onClick={() =>
                        setVariantGallery((current) =>
                          current
                            ? { ...current, activeIndex: index }
                            : current,
                        )
                      }
                      className={[
                        "overflow-hidden border",
                        index === variantGallery.activeIndex
                          ? "border-ui-border-interactive"
                          : "border-ui-border-base",
                      ].join(" ")}
                    >
                      <img
                        src={asset.contentUrl}
                        alt={asset.fileName}
                        className="h-20 w-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
