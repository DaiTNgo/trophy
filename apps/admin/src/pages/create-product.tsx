import {
  Badge,
  Button,
  FocusModal,
  Heading,
  IconButton,
  Input,
  Kbd,
  Label,
  ProgressTabs,
  Select,
  Switch,
  Table,
  Text,
  Textarea,
} from "@medusajs/ui";
import { ExternalLink, Loader2, Trash2, Upload, X } from "lucide-react";
import { startTransition, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { InlineError } from "../components/ui/medusa/inline-error";
import { useCatalog } from "../hooks/use-catalog";
import {
  categoryOptions,
  collectionOptions,
  typeOptions,
} from "../lib/mock-data";
import {
  deleteProductVariantMedia,
  uploadProductVariantMedia,
} from "../lib/product-assets-client";
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
  const [uploadingVariantKeys, setUploadingVariantKeys] = useState<string[]>(
    [],
  );
  const [deletingAssetIds, setDeletingAssetIds] = useState<string[]>([]);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
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

  function toggleCategory(category: string) {
    setValues((current) => ({
      ...current,
      categories: current.categories.includes(category)
        ? current.categories.filter((value) => value !== category)
        : [...current.categories, category],
    }));
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

  function submit(mode: "draft" | "publish") {
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

    const nextProduct = createProduct({
      mode,
      values,
      attributes,
      optionDefinitions,
      variantRows: effectiveVariantRows,
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
    setUploadingVariantKeys((current) => [...current, variantSignature]);

    try {
      const uploadedAssets = await Promise.all(
        Array.from(files).map((file) => uploadProductVariantMedia(file)),
      );
      updateVariantMedia(variantSignature, (currentMedia) => [
        ...currentMedia,
        ...uploadedAssets,
      ]);
    } catch (error) {
      setVariantMediaError(
        error instanceof Error
          ? error.message
          : "Unable to upload variant media.",
      );
    } finally {
      setUploadingVariantKeys((current) =>
        current.filter((key) => key !== variantSignature),
      );
    }
  }

  async function handleDeleteVariantMedia(
    variantSignature: string,
    assetId: string,
  ) {
    setVariantMediaError(null);
    setDeletingAssetIds((current) => [...current, assetId]);

    try {
      await deleteProductVariantMedia(assetId);
      updateVariantMedia(variantSignature, (currentMedia) =>
        currentMedia.filter((asset) => asset.id !== assetId),
      );
    } catch (error) {
      setVariantMediaError(
        error instanceof Error
          ? error.message
          : "Unable to delete variant media.",
      );
    } finally {
      setDeletingAssetIds((current) =>
        current.filter((currentId) => currentId !== assetId),
      );
    }
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
          if (!open) {
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
              <div className="px-6 py-6">
                {errors.form ? <InlineError message={errors.form} /> : null}
                {errors.publish ? (
                  <InlineError message={errors.publish} />
                ) : null}

                <ProgressTabs.Content value="details" className="outline-none">
                  <div className="space-y-5">
                    <div>
                      <Heading level="h2">General</Heading>
                      <Text size="small" className="mt-1 text-ui-fg-subtle">
                        Core product identity, handle, media, and merchandising
                        copy.
                      </Text>
                    </div>

                    <div className="grid gap-5 md:grid-cols-2">
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

                    <div className="grid gap-5 md:grid-cols-2">
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
                        <Label htmlFor="product-media">Media URLs</Label>
                        <Input
                          id="product-media"
                          value={values.media}
                          onChange={(event) =>
                            setValue("media", event.target.value)
                          }
                          placeholder="https://cdn.example.com/hero.jpg"
                        />
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
                  </div>

                  <div className="rounded-lg border border-ui-border-base px-4 py-4">
                    <div className="flex items-start gap-4">
                      <Switch
                        checked={values.hasVariants}
                        onCheckedChange={(checked) =>
                          setValue("hasVariants", checked)
                        }
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
                          <Heading level="h2">Product options</Heading>
                          <Text size="small" className="mt-1 text-ui-fg-subtle">
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
                                      <Badge key={value.id} color="blue">
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
                                      value={optionValueDrafts[option.id] ?? ""}
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

                      <div className="space-y-4 pt-2">
                        <div>
                          <Heading level="h2">Variant preview</Heading>
                          <Text size="small" className="mt-1 text-ui-fg-subtle">
                            Review the combinations that will be priced in the
                            Variants tab.
                          </Text>
                        </div>

                        <div className="space-y-3">
                          {effectiveVariantRows.length === 0 ? (
                            <div className="rounded-lg border border-dashed border-ui-border-base px-4 py-5">
                              <Text size="small" className="text-ui-fg-subtle">
                                Add at least one option with values to preview
                                generated variants.
                              </Text>
                            </div>
                          ) : (
                            effectiveVariantRows.map((variant) => (
                              <div
                                key={buildVariantSignature(variant.options)}
                                className="rounded-xl border border-ui-border-base px-4 py-4"
                              >
                                <div className="flex items-start justify-between gap-4">
                                  <div className="min-w-0">
                                    <Text weight="plus">{variant.title}</Text>
                                    <Text
                                      size="small"
                                      className="mt-1 text-ui-fg-subtle"
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
                                  <Badge color="grey">
                                    {variant.options.length > 0
                                      ? "Generated"
                                      : "Default"}
                                  </Badge>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  ) : null}

                  <div className="space-y-4 border-t border-ui-border-base pt-6">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <Heading level="h2">Attributes</Heading>
                        <Text size="small" className="mt-1 text-ui-fg-subtle">
                          Optional product properties that do not affect variant
                          generation.
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
                              updateAttribute(index, "key", event.target.value)
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
                </ProgressTabs.Content>

                <ProgressTabs.Content value="organize" className="outline-none">
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
                      <Text size="small" className="text-ui-fg-subtle">
                        Choose the taxonomy nodes this product should appear in.
                      </Text>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label>Categories</Label>
                    <div className="flex flex-wrap gap-3">
                      {categoryOptions.map((category) => {
                        const checked = values.categories.includes(category);
                        return (
                          <button
                            key={category}
                            type="button"
                            onClick={() => toggleCategory(category)}
                            className={[
                              "rounded-full border px-4 py-2 text-sm font-medium transition",
                              checked
                                ? "border-ui-border-interactive bg-ui-bg-base text-ui-fg-base shadow-elevation-card-rest"
                                : "border-ui-border-base bg-ui-bg-base text-ui-fg-subtle hover:text-ui-fg-base",
                            ].join(" ")}
                          >
                            {category}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </ProgressTabs.Content>

                <ProgressTabs.Content value="variants" className="space-y-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <Heading level="h2">Product variants</Heading>
                      <Text size="small" className="mt-1 text-ui-fg-subtle">
                        Edit each sellable unit directly with title, SKU, price,
                        inventory, and backorder policy.
                      </Text>
                    </div>
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
                          <Table.HeaderCell>SKU</Table.HeaderCell>
                          <Table.HeaderCell>Media</Table.HeaderCell>
                          <Table.HeaderCell>Allow backorder</Table.HeaderCell>
                          <Table.HeaderCell>Price</Table.HeaderCell>
                          <Table.HeaderCell>
                            Inventory quantity
                          </Table.HeaderCell>
                        </Table.Row>
                      </Table.Header>
                      <Table.Body>
                        {effectiveVariantRows.map((variant, index) => (
                          <Table.Row
                            key={buildVariantSignature(variant.options)}
                            className="align-top"
                          >
                            <Table.Cell className="py-4">
                              <div className="min-w-[180px]">
                                <Input
                                  value={variant.title}
                                  onChange={(event) =>
                                    updateVariantRow(
                                      index,
                                      "title",
                                      event.target.value,
                                    )
                                  }
                                  placeholder="Default variant"
                                />
                                <Text
                                  size="small"
                                  className="mt-2 text-ui-fg-subtle"
                                >
                                  {variant.options.length > 0
                                    ? variant.options
                                        .map(
                                          (option) =>
                                            `${option.option}: ${option.value}`,
                                        )
                                        .join(" • ")
                                    : "Default option value"}
                                </Text>
                              </div>
                            </Table.Cell>
                            <Table.Cell className="py-4">
                              <Input
                                value={variant.sku}
                                onChange={(event) =>
                                  updateVariantRow(
                                    index,
                                    "sku",
                                    event.target.value,
                                  )
                                }
                                placeholder="SKU"
                              />
                            </Table.Cell>
                            <Table.Cell className="py-4">
                              {(() => {
                                const variantSignature = buildVariantSignature(
                                  variant.options,
                                );
                                const isUploading =
                                  uploadingVariantKeys.includes(
                                    variantSignature,
                                  );

                                return (
                                  <div className="min-w-[240px] space-y-3">
                                    <input
                                      ref={(element) => {
                                        fileInputRefs.current[
                                          variantSignature
                                        ] = element;
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
                                        fileInputRefs.current[
                                          variantSignature
                                        ]?.click()
                                      }
                                    >
                                      {isUploading ? (
                                        <Loader2 className="size-4 animate-spin" />
                                      ) : (
                                        <Upload className="size-4" />
                                      )}
                                      {isUploading
                                        ? "Uploading..."
                                        : "Upload media"}
                                    </Button>
                                    {variant.media.length === 0 ? (
                                      <Text
                                        size="small"
                                        className="text-ui-fg-subtle"
                                      >
                                        No variant media yet.
                                      </Text>
                                    ) : (
                                      <div className="grid grid-cols-2 gap-3">
                                        {variant.media.map((asset) => {
                                          const isDeleting =
                                            deletingAssetIds.includes(asset.id);
                                          return (
                                            <div
                                              key={asset.id}
                                              className="overflow-hidden rounded-lg border border-ui-border-base"
                                            >
                                              <a
                                                href={asset.contentUrl}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="block bg-ui-bg-subtle"
                                              >
                                                <img
                                                  src={asset.contentUrl}
                                                  alt={asset.fileName}
                                                  className="h-24 w-full object-cover"
                                                />
                                              </a>
                                              <div className="space-y-2 px-3 py-3">
                                                <Text
                                                  size="small"
                                                  weight="plus"
                                                  className="line-clamp-1"
                                                >
                                                  {asset.fileName}
                                                </Text>
                                                <Text
                                                  size="small"
                                                  className="text-ui-fg-subtle"
                                                >
                                                  {asset.widthPx}x
                                                  {asset.heightPx}
                                                </Text>
                                                <div className="flex gap-2">
                                                  <a
                                                    href={asset.contentUrl}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="inline-flex items-center gap-1 rounded-md border border-ui-border-base px-2 py-1 text-xs font-medium text-ui-fg-base"
                                                  >
                                                    <ExternalLink className="size-3" />
                                                    Preview
                                                  </a>
                                                  <Button
                                                    type="button"
                                                    variant="secondary"
                                                    size="small"
                                                    disabled={isDeleting}
                                                    onClick={() => {
                                                      void handleDeleteVariantMedia(
                                                        variantSignature,
                                                        asset.id,
                                                      );
                                                    }}
                                                  >
                                                    {isDeleting ? (
                                                      <Loader2 className="size-4 animate-spin" />
                                                    ) : (
                                                      <Trash2 className="size-4" />
                                                    )}
                                                    Delete
                                                  </Button>
                                                </div>
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>
                                );
                              })()}
                            </Table.Cell>
                            <Table.Cell className="py-4">
                              <div className="flex justify-center pt-1">
                                <Switch
                                  checked={variant.allowBackorder}
                                  onCheckedChange={(checked) =>
                                    updateVariantRow(
                                      index,
                                      "allowBackorder",
                                      checked,
                                    )
                                  }
                                />
                              </div>
                            </Table.Cell>
                            <Table.Cell className="py-4">
                              <div className="flex min-w-[140px] items-center rounded-md border border-ui-border-base bg-ui-bg-field px-2 shadow-buttons-neutral">
                                <Text
                                  size="small"
                                  className="px-1 text-ui-fg-muted"
                                >
                                  $
                                </Text>
                                <Input
                                  value={
                                    variant.price === 0
                                      ? ""
                                      : String(variant.price)
                                  }
                                  onChange={(event) =>
                                    updateVariantRow(
                                      index,
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
                            <Table.Cell className="py-4">
                              <Input
                                value={String(variant.inventory)}
                                onChange={(event) =>
                                  updateVariantRow(
                                    index,
                                    "inventory",
                                    Number(event.target.value || 0),
                                  )
                                }
                                type="number"
                                placeholder="0"
                              />
                            </Table.Cell>
                          </Table.Row>
                        ))}
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
                onClick={() => navigate("/products")}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => submit("draft")}
              >
                Save as draft
              </Button>
              <Button
                type="button"
                onClick={
                  isLastStep ? () => submit("publish") : continueToNextStep
                }
              >
                {isLastStep ? "Publish" : "Continue"}
              </Button>
            </div>
          </FocusModal.Footer>
        </FocusModal.Content>
      </FocusModal>

      <datalist id="product-types">
        {typeOptions.map((option) => (
          <option key={option} value={option} />
        ))}
      </datalist>
    </>
  );
}
