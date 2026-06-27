import {
  Badge,
  Button,
  Checkbox,
  DropdownMenu,
  FocusModal,
  Heading,
  IconButton,
  Input,
  Label,
  ProgressTabs,
  Select,
  Switch,
  Table,
  Text,
  Textarea,
} from "@medusajs/ui";
import {
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Loader2,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { startTransition, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";

import { CategoryMultiSelect } from "../components/ui/medusa/category-multiselect";
import { InlineError } from "../components/ui/medusa/inline-error";
import { useCatalog } from "../hooks/use-catalog";
import {
  categoryOptions,
  collectionOptions,
  typeOptions,
} from "../lib/mock-data";
import { uploadProductVariantMedia } from "../lib/product-assets-client";
import {
  createEmptyOptionDefinition,
  createOptionValueDefinition,
  isPublishReady,
  reconcileVariantRows,
  validateCreateProduct,
} from "../lib/product-utils";
import { slugify } from "../lib/utils";
import type {
  CreateProductErrors,
  CreateProductFormValues,
  ProductAttribute,
  ProductOptionDefinition,
  ProductVariant,
  ProductVariantMedia,
} from "../types";
import { ProductsListPage } from "./products-list";
import {Adjustments} from '@medusajs/icons'

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

/*
 * buildVariantSignature is defined in product-utils.ts but also needed inline here for the key function.
 * The import from utils re-exports it from product-utils, but it's not exported from utils.
 * Let me check... Actually buildVariantSignature is only used locally in reconcileVariantRows
 * which is in product-utils.ts. So I don't need to import it here separately.
 *
 * Actually wait, there's no import of buildVariantSignature or slugify from utils needed here.
 * Let me verify: in the original code, CreateProductPage uses slugify for the handle preview.
 */

export function CreateProductPage() {
  const { products, createProduct } = useCatalog();
  const navigate = useNavigate();
  const [values, setValues] = useState<CreateProductFormValues>(
    defaultCreateProductValues,
  );
  const [attributes, setAttributes] = useState<ProductAttribute[]>([
    { key: "", value: "" },
  ]);
  const [errors, setErrors] = useState<CreateProductErrors>({});
  const [optionDefinitions, setOptionDefinitions] = useState<
    ProductOptionDefinition[]
  >([]);
  const [optionValueDrafts, setOptionValueDrafts] = useState<
    Record<string, string>
  >({});
  const [activeStep, setActiveStep] = useState<
    "details" | "organize" | "variants"
  >("details");
  const [variantRows, setVariantRows] = useState<ProductVariant[]>(() =>
    reconcileVariantRows([], defaultCreateProductValues, []),
  );
  const [variantMediaError, setVariantMediaError] = useState<string | null>(
    null,
  );
  const [processingVariantKeys, setProcessingVariantKeys] = useState<string[]>(
    [],
  );
  const [isSubmittingMedia, setIsSubmittingMedia] = useState(false);
  const [variantGallery, setVariantGallery] = useState<{
    title: string;
    assets: ProductVariantMedia[];
    activeIndex: number;
  } | null>(null);
  const variantViewColumns = [
    { id: "sku", label: "SKU" },
    { id: "media", label: "Media" },
    { id: "backorder", label: "Allow backorder" },
    { id: "price", label: "Price" },
    { id: "inventory", label: "Inventory quantity" },
  ] as const;
  type VariantViewColumnId = (typeof variantViewColumns)[number]["id"];
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const [showColumns, setShowColumns] = useState<Record<VariantViewColumnId, boolean>>({
    sku: true,
    media: true,
    backorder: true,
    price: true,
    inventory: true,
  });
  const stepOrder = ["details", "organize", "variants"] as const;
  const activeStepIndex = stepOrder.indexOf(activeStep);
  const isLastStep = activeStep === "variants";
  const effectiveVariantRows = useMemo(
    () => reconcileVariantRows(variantRows, values, optionDefinitions),
    [optionDefinitions, values, variantRows],
  );
  const publishReady = isPublishReady(
    values,
    effectiveVariantRows,
    optionDefinitions,
  );

  useEffect(() => {
    setVariantRows((current) =>
      reconcileVariantRows(current, values, optionDefinitions),
    );
  }, [optionDefinitions, values.hasVariants, values.inventory]);

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
        e.preventDefault();
        e.stopPropagation();
        closeVariantGallery();
      }
    }

    document.addEventListener("keydown", handleKeyDown, true);
    return () => document.removeEventListener("keydown", handleKeyDown, true);
  }, [variantGallery]);

  function setValue<K extends keyof CreateProductFormValues>(
    key: K,
    nextValue: CreateProductFormValues[K],
  ) {
    setValues((current) => ({ ...current, [key]: nextValue }));
  }

  function updateAttribute(
    index: number,
    key: keyof ProductAttribute,
    nextValue: string,
  ) {
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
    setAttributes((current) =>
      current.filter((_, currentIndex) => currentIndex !== index),
    );
  }

  function clearErrors() {
    setErrors({});
  }

  function getStepErrors(
    step: "details" | "organize" | "variants",
    nextErrors: CreateProductErrors,
  ) {
    const stepKeys: Record<typeof step, string[]> = {
      details: ["title", "handle", "attributes", "optionDefinitions", "form"],
      organize: ["form"],
      variants: ["variants", "publish", "form"],
    };

    return Object.fromEntries(
      Object.entries(nextErrors).filter(([key]) =>
        stepKeys[step].includes(key),
      ),
    ) as CreateProductErrors;
  }

  function goToStep(step: "details" | "organize" | "variants") {
    setActiveStep(step);
    clearErrors();
  }

  function continueToNextStep() {
    const validationErrors = validateCreateProduct({
      mode: "draft",
      values,
      attributes,
      products,
      optionDefinitions,
      variantRows: effectiveVariantRows,
    });
    const scopedErrors = getStepErrors(activeStep, validationErrors);

    if (Object.keys(scopedErrors).length > 0) {
      setErrors(scopedErrors);
      return;
    }

    const nextStep = stepOrder[activeStepIndex + 1];
    if (!nextStep) {
      return;
    }

    clearErrors();
    setActiveStep(nextStep);
  }

  async function submit(mode: "draft" | "publish") {
    const nextErrors = validateCreateProduct({
      mode,
      values,
      attributes,
      products,
      optionDefinitions,
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
                return {
                  ...media,
                  file: undefined,
                  isPending: undefined,
                };
              }

              const uploaded = await uploadProductVariantMedia(media.file);
              return uploaded;
            }),
          );

          return {
            ...variant,
            media: uploadedMedia,
          };
        }),
      );

      const nextProduct = createProduct({
        mode,
        values,
        attributes,
        optionDefinitions,
        variantRows: variantRowsWithUploadedMedia,
      });

      setErrors({});
      startTransition(() => {
        navigate("/products", {
          replace: true,
          state: {
            flash: `${nextProduct.title} was created as ${mode === "publish" ? nextProduct.status.toLowerCase() : "draft"}.`,
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

  function addOptionDefinition() {
    const nextOption = createEmptyOptionDefinition();
    setOptionDefinitions((current) => [...current, nextOption]);
    setOptionValueDrafts((current) => ({ ...current, [nextOption.id]: "" }));
  }

  function removeOptionDefinition(optionId: string) {
    setOptionDefinitions((current) =>
      current.filter((option) => option.id !== optionId),
    );
    setOptionValueDrafts((current) => {
      const next = { ...current };
      delete next[optionId];
      return next;
    });
  }

  function updateOptionDefinition(optionId: string, title: string) {
    setOptionDefinitions((current) =>
      current.map((option) =>
        option.id === optionId ? { ...option, title } : option,
      ),
    );
  }

  function setOptionDraftValue(optionId: string, draft: string) {
    setOptionValueDrafts((current) => ({ ...current, [optionId]: draft }));
  }

  function appendOptionValue(optionId: string) {
    const draft = optionValueDrafts[optionId] ?? "";
    const nextValues = draft
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);
    if (nextValues.length === 0) {
      return;
    }

    setOptionDefinitions((current) =>
      current.map((option) => {
        if (option.id !== optionId) {
          return option;
        }

        const existing = new Set(
          option.values.map((value) => value.value.toLowerCase()),
        );
        const appended = nextValues
          .filter((value) => !existing.has(value.toLowerCase()))
          .map((value) => createOptionValueDefinition(value));
        return {
          ...option,
          values: [...option.values, ...appended],
        };
      }),
    );
    setOptionDraftValue(optionId, "");
  }

  function removeOptionValue(optionId: string, valueId: string) {
    setOptionDefinitions((current) =>
      current.map((option) =>
        option.id === optionId
          ? {
              ...option,
              values: option.values.filter((value) => value.id !== valueId),
            }
          : option,
      ),
    );
  }

  function updateVariantRow(
    index: number,
    key: keyof ProductVariant,
    nextValue: string | number | boolean,
  ) {
    setVariantRows((current) =>
      current.map((variant, currentIndex) =>
        currentIndex === index ? { ...variant, [key]: nextValue } : variant,
      ),
    );
  }

  function toggleVariantCreation(index: number) {
    setVariantRows((current) =>
      current.map((variant, currentIndex) =>
        currentIndex === index
          ? { ...variant, shouldCreate: !variant.shouldCreate }
          : variant,
      ),
    );
  }

  function toggleAllVariants(selected: boolean) {
    setVariantRows((current) =>
      current.map((variant) => ({ ...variant, shouldCreate: selected })),
    );
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
    if (!files || files.length === 0) {
      return;
    }

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
            const image = new Image();
            image.onload = () => {
              resolve({
                width: image.naturalWidth,
                height: image.naturalHeight,
              });
            };
            image.onerror = () => {
              reject(new Error("Image data is invalid or unsupported."));
            };
            image.src = objectUrl;
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

  async function handleDeleteVariantMedia(
    variantSignature: string,
    assetId: string,
  ) {
    setVariantMediaError(null);

    try {
      updateVariantMedia(variantSignature, (currentMedia) => {
        const target = currentMedia.find((asset) => asset.id === assetId);
        if (target?.isPending) {
          URL.revokeObjectURL(target.contentUrl);
        }

        return currentMedia.filter((asset) => asset.id !== assetId);
      });
    } catch (error) {
      setVariantMediaError(
        error instanceof Error
          ? error.message
          : "Unable to delete variant media.",
      );
    }
  }

  function openVariantGallery(
    title: string,
    assets: ProductVariantMedia[],
    activeIndex: number,
  ) {
    if (assets.length === 0) {
      return;
    }

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
      if (!current) {
        return current;
      }

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
      if (!current) {
        return current;
      }

      return {
        ...current,
        activeIndex:
          current.activeIndex === current.assets.length - 1
            ? 0
            : current.activeIndex + 1,
      };
    });
  }

  function buildVariantSignature(options: { option: string; value: string }[]) {
    if (options.length === 0) {
      return "__default__";
    }
    return options
      .map((option) => `${option.option}:${option.value}`)
      .join("|");
  }

  return (
    <>
      <ProductsListPage />
      <FocusModal
        open
        onOpenChange={(open) => {
          if (!open && !variantGallery) {
            navigate("/products");
          }
        }}
      >
        <FocusModal.Content className="md:inset-2">
          <ProgressTabs
            value={activeStep}
            onValueChange={(value) =>
              goToStep(value as "details" | "organize" | "variants")
            }
            className="flex min-h-0 flex-1 flex-col overflow-hidden"
          >
            <FocusModal.Header>
              <ProgressTabs.List className="-my-2 w-full border-l">
                {stepOrder.map((step) => {
                  const stepLabel =
                    step === "details"
                      ? "Details"
                      : step === "organize"
                        ? "Organize"
                        : "Variants";
                  const status =
                    stepOrder.indexOf(step) < activeStepIndex
                      ? "completed"
                      : step === activeStep
                        ? "in-progress"
                        : "not-started";
                  return (
                    <ProgressTabs.Trigger
                      key={step}
                      value={step}
                      status={status}
                    >
                      {stepLabel}
                    </ProgressTabs.Trigger>
                  );
                })}
              </ProgressTabs.List>
            </FocusModal.Header>

            <FocusModal.Body className="overflow-y-auto">
              <div className="">
                {errors.form ? <InlineError message={errors.form} /> : null}
                {errors.publish ? (
                  <InlineError message={errors.publish} />
                ) : null}

                <ProgressTabs.Content
                  value="details"
                  className="outline-none px-6 py-6"
                >
                  <div className="space-y-8 ">
                    <div>
                      <Heading level="h2">General</Heading>
                      <Text size="small" className="mt-1 text-ui-fg-subtle">
                        Core product identity, handle, media, and merchandising
                        copy.
                      </Text>
                    </div>

                    <div className="grid gap-5 md:grid-cols-3">
                      <div className="space-y-2">
                        <Label htmlFor="product-title">Title</Label>
                        <Input
                          id="product-title"
                          value={values.title}
                          onChange={(event) =>
                            setValue("title", event.target.value)
                          }
                          placeholder="Winter jacket"
                        />
                        {errors.title ? (
                          <Text size="small" className="text-rose-700">
                            {errors.title}
                          </Text>
                        ) : null}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="product-subtitle">Subtitle</Label>
                        <Input
                          id="product-subtitle"
                          value={values.subtitle}
                          onChange={(event) =>
                            setValue("subtitle", event.target.value)
                          }
                          placeholder="Warm and cosy"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="product-handle">Handle</Label>
                        <div className="flex items-center rounded-md border border-ui-border-base bg-ui-bg-field px-2 shadow-buttons-neutral">
                          <Text size="small" className="px-1 text-ui-fg-muted">
                            /
                          </Text>
                          <Input
                            id="product-handle"
                            value={values.handle}
                            onChange={(event) =>
                              setValue("handle", event.target.value)
                            }
                            className="border-0 bg-transparent shadow-none"
                            placeholder="winter-jacket"
                          />
                        </div>
                        {errors.handle ? (
                          <Text size="small" className="text-rose-700">
                            {errors.handle}
                          </Text>
                        ) : (
                          <Text size="small" className="text-ui-fg-subtle">
                            Leave blank to generate it from the title.
                          </Text>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="product-description">Description</Label>
                      <Textarea
                        id="product-description"
                        value={values.description}
                        onChange={(event) =>
                          setValue("description", event.target.value)
                        }
                        placeholder="A warm and cozy jacket"
                      />
                    </div>

                    <div className="space-y-4 border-t border-ui-border-base pt-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <Heading level="h2">Attributes</Heading>
                          <Text size="small" className="mt-1 text-ui-fg-subtle">
                            Optional product properties that do not affect
                            variant generation.
                          </Text>
                        </div>
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={addAttributeRow}
                        >
                          Add attribute
                        </Button>
                      </div>
                      <div className="space-y-3">
                        {attributes.map((attribute, index) => (
                          <div
                            key={`${index}-${attribute.key}`}
                            className="grid gap-3 md:grid-cols-[1fr_1fr_auto]"
                          >
                            <Input
                              value={attribute.key}
                              onChange={(event) =>
                                updateAttribute(
                                  index,
                                  "key",
                                  event.target.value,
                                )
                              }
                              placeholder="Material"
                            />
                            <Input
                              value={attribute.value}
                              onChange={(event) =>
                                updateAttribute(
                                  index,
                                  "value",
                                  event.target.value,
                                )
                              }
                              placeholder="Cotton blend"
                            />
                            <Button
                              type="button"
                              variant="secondary"
                              onClick={() => removeAttributeRow(index)}
                              disabled={attributes.length === 1}
                            >
                              Remove
                            </Button>
                          </div>
                        ))}
                        {errors.attributes ? (
                          <InlineError message={errors.attributes} />
                        ) : null}
                      </div>
                    </div>

                    <div>
                      <Heading level="h2">Variants</Heading>
                      <Text size="small" className="mt-1 text-ui-fg-subtle">
                        Manage variant options and pricing.
                      </Text>
                    </div>

                    <div className="rounded-lg border border-ui-border-base px-4 py-4">
                      <div className="flex items-start gap-4">
                        <Switch
                          checked={values.hasVariants}
                          onCheckedChange={(checked) => {
                            setValue("hasVariants", checked);
                            if (checked && optionDefinitions.length === 0) {
                              addOptionDefinition();
                            }
                          }}
                        />
                        <div>
                          <Heading level="h3">
                            Yes, this is a product with variants
                          </Heading>
                          <Text className="mt-1 text-ui-fg-subtle">
                            When unchecked, we will create a default variant for
                            you
                          </Text>
                        </div>
                      </div>
                    </div>

                    {values.hasVariants ? (
                      <div className="space-y-5">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <Heading level="h3">Product options</Heading>
                            <Text
                              size="small"
                              className="mt-1 text-ui-fg-subtle"
                            >
                              Define the options for the product, e.g. color,
                              size, etc.
                            </Text>
                          </div>
                          <Button
                            type="button"
                            variant="secondary"
                            onClick={addOptionDefinition}
                          >
                            Add
                          </Button>
                        </div>

                        {optionDefinitions.length === 0 ? (
                          <div className="rounded-lg border border-dashed border-ui-border-base px-4 py-5">
                            <Text size="small" className="text-ui-fg-subtle">
                              Add your first product option to start generating
                              variant rows.
                            </Text>
                          </div>
                        ) : null}

                        <div className="space-y-4">
                          {optionDefinitions.map((option) => (
                            <div
                              key={option.id}
                              className="rounded-xl border border-ui-border-base p-4"
                            >
                              <div className="grid gap-4 lg:grid-cols-[84px_minmax(0,1fr)_32px]">
                                <div className="space-y-6 pt-2">
                                  <Text weight="plus" size="small">
                                    Title
                                  </Text>
                                  <Text weight="plus" size="small">
                                    Values
                                  </Text>
                                </div>
                                <div className="space-y-3">
                                  <Input
                                    value={option.title}
                                    onChange={(event) =>
                                      updateOptionDefinition(
                                        option.id,
                                        event.target.value,
                                      )
                                    }
                                    placeholder="Color"
                                  />
                                  <div className="rounded-md border border-ui-border-base bg-ui-bg-field px-3 py-2 shadow-buttons-neutral">
                                    <div className="flex flex-wrap gap-2">
                                      {option.values.map((value) => (
                                        <Badge
                                          key={value.id}
                                          size="xsmall"
                                          color="blue"
                                        >
                                          {value.value}
                                          <button
                                            type="button"
                                            className="ml-1 inline-flex"
                                            onClick={() =>
                                              removeOptionValue(
                                                option.id,
                                                value.id,
                                              )
                                            }
                                            aria-label={`Remove ${value.value}`}
                                          >
                                            <X className="size-3" />
                                          </button>
                                        </Badge>
                                      ))}
                                      <input
                                        value={
                                          optionValueDrafts[option.id] ?? ""
                                        }
                                        onChange={(event) =>
                                          setOptionDraftValue(
                                            option.id,
                                            event.target.value,
                                          )
                                        }
                                        onBlur={() =>
                                          appendOptionValue(option.id)
                                        }
                                        onKeyDown={(event) => {
                                          if (
                                            event.key === "Enter" ||
                                            event.key === ","
                                          ) {
                                            event.preventDefault();
                                            appendOptionValue(option.id);
                                          }
                                        }}
                                        className="min-w-[180px] flex-1 border-0 bg-transparent text-sm outline-none placeholder:text-ui-fg-muted"
                                        placeholder={
                                          option.values.length > 0
                                            ? "Add another value"
                                            : "Red, Blue, Green"
                                        }
                                      />
                                    </div>
                                  </div>
                                </div>
                                <div className="flex justify-end pt-1">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      removeOptionDefinition(option.id)
                                    }
                                    className="text-ui-fg-muted transition hover:text-ui-fg-base"
                                    aria-label="Remove option"
                                  >
                                    <X className="size-5" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>

                        {errors.optionDefinitions ? (
                          <InlineError message={errors.optionDefinitions} />
                        ) : null}

                        <div>
                          <Heading level="h3">Product variants</Heading>
                          <Text size="small" className="mt-1 text-ui-fg-subtle">
                            Select the variant combinations to create.
                          </Text>
                        </div>

                        <div className="overflow-hidden rounded-xl border">
                          <div
                            className="bg-ui-bg-component text-ui-fg-subtle grid items-center gap-3 border-b px-6 py-2.5"
                            style={{ gridTemplateColumns: "20px 1fr" }}
                          >
                            <Checkbox
                              checked={
                                effectiveVariantRows.length > 0 &&
                                effectiveVariantRows.every(
                                  (v) => v.shouldCreate,
                                )
                              }
                              onCheckedChange={(checked) =>
                                toggleAllVariants(checked === true)
                              }
                            />
                            <Text size="small" weight="plus">
                              Title / SKU
                            </Text>
                          </div>

                          <div>
                            {effectiveVariantRows.length === 0 ? (
                              <div className="px-6 py-5">
                                <Text
                                  size="small"
                                  className="text-ui-fg-subtle"
                                >
                                  Add at least one option with values to
                                  generate variants.
                                </Text>
                              </div>
                            ) : (
                              effectiveVariantRows.map((variant, index) => (
                                <div
                                  key={buildVariantSignature(variant.options)}
                                  className="grid items-center gap-3 border-b border-ui-border-base px-6 py-2.5 last:border-b-0"
                                  style={{
                                    gridTemplateColumns: "20px 1fr",
                                  }}
                                >
                                  <Checkbox
                                    checked={variant.shouldCreate}
                                    onCheckedChange={() =>
                                      toggleVariantCreation(index)
                                    }
                                  />
                                  <div className="min-w-0">
                                    <Text size="small" weight="plus">
                                      {variant.title}
                                    </Text>
                                    <Text
                                      size="small"
                                      className="text-ui-fg-subtle"
                                    >
                                      {variant.options.length > 0
                                        ? variant.options
                                            .map(
                                              (option) =>
                                                `${option.option}: ${option.value}`,
                                            )
                                            .join(" • ")
                                        : "Default variant"}
                                    </Text>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        </div>

                        <div className="bg-ui-bg-component txt-small text-ui-fg-subtle grid grid-cols-[4px_1fr] items-start gap-3 rounded-lg border p-3">
                          <div
                            role="presentation"
                            className="bg-ui-tag-neutral-icon h-full w-1 rounded-full"
                          />
                          <div className="text-pretty">
                            <strong className="txt-small-plus text-ui-fg-base">
                              Tip:
                            </strong>{" "}
                            Variants left unchecked won't be created. You can
                            always create and edit variants afterwards but this
                            list fits the variations in your product options.
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </ProgressTabs.Content>

                <ProgressTabs.Content
                  value="organize"
                  className="outline-none px-6 py-6"
                >
                  <div>
                    <Heading level="h2">Organize</Heading>
                    <Text size="small" className="mt-1 text-ui-fg-subtle">
                      Assign lightweight merchandising structure without mixing
                      in pricing or shipping logic.
                    </Text>
                  </div>

                  <div className="grid gap-5 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Type</Label>
                      <Select
                        value={values.type}
                        onValueChange={(value) => setValue("type", value)}
                      >
                        <Select.Trigger>
                          <Select.Value placeholder="Select type" />
                        </Select.Trigger>
                        <Select.Content>
                          {typeOptions.map((option) => (
                            <Select.Item key={option} value={option}>
                              {option}
                            </Select.Item>
                          ))}
                        </Select.Content>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Collection</Label>
                      <Select
                        value={values.collection}
                        onValueChange={(value) => setValue("collection", value)}
                      >
                        <Select.Trigger>
                          <Select.Value placeholder="Select collection" />
                        </Select.Trigger>
                        <Select.Content>
                          {collectionOptions.map((option) => (
                            <Select.Item key={option} value={option}>
                              {option}
                            </Select.Item>
                          ))}
                        </Select.Content>
                      </Select>
                    </div>
                  </div>

                  <div className="grid gap-5 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="product-tags">Tags</Label>
                      <Input
                        id="product-tags"
                        value={values.tags}
                        onChange={(event) =>
                          setValue("tags", event.target.value)
                        }
                        placeholder="summer, drop"
                      />
                      <Text size="small" className="text-ui-fg-subtle">
                        Comma separated.
                      </Text>
                    </div>
                    <div className="space-y-2">
                      <Label>Categories</Label>
                      <CategoryMultiSelect
                        values={values.categories}
                        options={categoryOptions}
                        onChange={(categories) =>
                          setValue("categories", categories)
                        }
                      />
                    </div>
                  </div>
                </ProgressTabs.Content>

                <ProgressTabs.Content value="variants" className="space-y-5">
                  <div className="flex items-center justify-between gap-4 px-2 pt-2">
                    <DropdownMenu>
                      <DropdownMenu.Trigger asChild>
                        <Button variant="secondary" size="small">
                          <Adjustments className="size-4" />
                          Views
                        </Button>
                      </DropdownMenu.Trigger>
                      <DropdownMenu.Content align="start">
                        <DropdownMenu.Label>Toggle columns</DropdownMenu.Label>
                        <DropdownMenu.Separator />
                        {variantViewColumns.map((col) => (
                          <DropdownMenu.CheckboxItem
                            key={col.id}
                            checked={showColumns[col.id]}
                            onCheckedChange={(checked) =>
                              setShowColumns((prev) => ({
                                ...prev,
                                [col.id]: checked === true,
                              }))
                            }
                          >
                            {col.label}
                          </DropdownMenu.CheckboxItem>
                        ))}
                      </DropdownMenu.Content>
                    </DropdownMenu>
                  </div>

                  {errors.variants ? (
                    <InlineError message={errors.variants} />
                  ) : null}
                  {variantMediaError ? (
                    <InlineError message={variantMediaError} />
                  ) : null}

                  <div className="overflow-x-auto">
                    <Table>
                      <Table.Header>
                        <Table.Row>
                          <Table.HeaderCell>Variant</Table.HeaderCell>
                          {showColumns.sku ? <Table.HeaderCell>SKU</Table.HeaderCell> : null}
                          {showColumns.media ? <Table.HeaderCell>Media</Table.HeaderCell> : null}
                          {showColumns.backorder ? (
                            <Table.HeaderCell>Allow backorder</Table.HeaderCell>
                          ) : null}
                          {showColumns.price ? <Table.HeaderCell>Price</Table.HeaderCell> : null}
                          {showColumns.inventory ? (
                            <Table.HeaderCell>Inventory quantity</Table.HeaderCell>
                          ) : null}
                        </Table.Row>
                      </Table.Header>
                      <Table.Body>
                        {effectiveVariantRows
                          .map((v, i) => ({ v, originalIndex: i }))
                          .filter(({ v }) => v.shouldCreate)
                          .map(({ v: variant, originalIndex }) => {
                            const variantSignature = buildVariantSignature(variant.options);
                            const isUploading = processingVariantKeys.includes(variantSignature);

                            return (
                              <Table.Row
                                key={variantSignature}
                                className="align-top"
                              >
                                <Table.Cell className="py-4">
                                  <div className="min-w-[180px]">
                                    <Input
                                      value={variant.title}
                                      onChange={(event) =>
                                        updateVariantRow(
                                          originalIndex,
                                          "title",
                                          event.target.value,
                                        )
                                      }
                                      placeholder="Default variant"
                                    />
                                    <Text size="small" className="mt-2 text-ui-fg-subtle">
                                      {variant.options.length > 0
                                        ? variant.options
                                            .map((option) => `${option.option}: ${option.value}`)
                                            .join(" • ")
                                        : "Default option value"}
                                    </Text>
                                  </div>
                                </Table.Cell>
                                {showColumns.sku ? (
                                  <Table.Cell className="py-4">
                                    <Input
                                      value={variant.sku}
                                      onChange={(event) =>
                                        updateVariantRow(
                                          originalIndex,
                                          "sku",
                                          event.target.value,
                                        )
                                      }
                                      placeholder="SKU"
                                    />
                                  </Table.Cell>
                                ) : null}
                                {showColumns.media ? (
                                  <Table.Cell className="py-4">
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
                                    <div className="min-w-[240px] space-y-3">
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
                                      {variant.media.length === 0 ? (
                                        <Text size="small" className="text-ui-fg-subtle">
                                          No variant media yet.
                                        </Text>
                                      ) : (
                                        <div className="grid grid-cols-2 gap-3">
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
                                                  className="h-24 w-full object-cover"
                                                />
                                              </button>
                                              <div className="space-y-2 px-3 py-3">
                                                <Text size="small" weight="plus" className="line-clamp-1">
                                                  {asset.fileName}
                                                </Text>
                                                <Text size="small" className="text-ui-fg-subtle">
                                                  {asset.widthPx}x{asset.heightPx}
                                                </Text>
                                                <div className="flex gap-2">
                                                  <a
                                                    href={asset.contentUrl}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="inline-flex items-center gap-1 rounded-md border border-ui-border-base px-2 py-1 text-xs font-medium text-ui-fg-base"
                                                    onClick={(event) => {
                                                      event.preventDefault();
                                                      openVariantGallery(
                                                        variant.title,
                                                        variant.media,
                                                        variant.media.findIndex(
                                                          (item) => item.id === asset.id,
                                                        ),
                                                      );
                                                    }}
                                                  >
                                                    <ExternalLink className="size-3" />
                                                    Preview
                                                  </a>
                                                  <Button
                                                    type="button"
                                                    variant="secondary"
                                                    size="small"
                                                    onClick={() => {
                                                      void handleDeleteVariantMedia(
                                                        variantSignature,
                                                        asset.id,
                                                      );
                                                    }}
                                                  >
                                                    <Trash2 className="size-4" />
                                                    Delete
                                                  </Button>
                                                </div>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  </Table.Cell>
                                ) : null}
                                {showColumns.backorder ? (
                                  <Table.Cell className="py-4">
                                    <div className="flex justify-center pt-1">
                                      <Switch
                                        checked={variant.allowBackorder}
                                        onCheckedChange={(checked) =>
                                          updateVariantRow(
                                            originalIndex,
                                            "allowBackorder",
                                            checked,
                                          )
                                        }
                                      />
                                    </div>
                                  </Table.Cell>
                                ) : null}
                                {showColumns.price ? (
                                  <Table.Cell className="py-4">
                                    <div className="flex min-w-[140px] items-center rounded-md border border-ui-border-base bg-ui-bg-field px-2 shadow-buttons-neutral">
                                      <Text size="small" className="px-1 text-ui-fg-muted">
                                        $
                                      </Text>
                                      <Input
                                        value={variant.price === 0 ? "" : String(variant.price)}
                                        onChange={(event) =>
                                          updateVariantRow(
                                            originalIndex,
                                            "price",
                                            Number(event.target.value || 0),
                                          )
                                        }
                                        type="number"
                                        className="border-0 bg-transparent shadow-none"
                                        placeholder="0"
                                      />
                                    </div>
                                  </Table.Cell>
                                ) : null}
                                {showColumns.inventory ? (
                                  <Table.Cell className="py-4">
                                    <Input
                                      value={String(variant.inventory)}
                                      onChange={(event) =>
                                        updateVariantRow(
                                          originalIndex,
                                          "inventory",
                                          Number(event.target.value || 0),
                                        )
                                      }
                                      type="number"
                                      placeholder="0"
                                    />
                                  </Table.Cell>
                                ) : null}
                              </Table.Row>
                            );
                          })}
                      </Table.Body>
                    </Table>
                  </div>
                </ProgressTabs.Content>
              </div>
            </FocusModal.Body>
          </ProgressTabs>

          <FocusModal.Footer className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-4">
              <Text size="small" className="text-ui-fg-subtle">
                Handle:{" "}
                <span className="text-ui-fg-base">
                  {values.handle.trim() ||
                    slugify(values.title || "new-product")}
                </span>
              </Text>
              <Text size="small" className="text-ui-fg-subtle">
                Variants:{" "}
                <span className="text-ui-fg-base">
                  {String(effectiveVariantRows.length)}
                </span>
              </Text>
              <Text size="small" className="text-ui-fg-subtle">
                Publish:{" "}
                <span className="text-ui-fg-base">
                  {publishReady.ready ? "Ready" : "Needs review"}
                </span>
              </Text>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                type="button"
                variant="secondary"
                disabled={isSubmittingMedia}
                onClick={() => navigate("/products")}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={isSubmittingMedia}
                onClick={() => submit("draft")}
              >
                {isSubmittingMedia ? "Uploading media..." : "Save as draft"}
              </Button>
              <Button
                type="button"
                disabled={isSubmittingMedia}
                onClick={
                  isLastStep ? () => submit("publish") : continueToNextStep
                }
              >
                {isSubmittingMedia
                  ? "Uploading media..."
                  : isLastStep
                    ? "Publish"
                    : "Continue"}
              </Button>
            </div>
          </FocusModal.Footer>
        </FocusModal.Content>
      </FocusModal>

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

      <datalist id="product-types">
        {typeOptions.map((option) => (
          <option key={option} value={option} />
        ))}
      </datalist>
    </>
  );
}
