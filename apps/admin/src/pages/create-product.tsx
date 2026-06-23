import {
  startTransition,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useNavigate } from "react-router";
import { GripVertical, X } from "lucide-react";
import {
  Badge,
  Button,
  Checkbox,
  FocusModal,
  Heading,
  Input,
  Label,
  Select,
  Switch,
  Table,
  Tabs,
  Text,
  Textarea,
} from "@medusajs/ui";
import { InlineError } from "../components/ui/medusa/inline-error";
import { useCatalog } from "../hooks/use-catalog";
import {
  collectionOptions,
  categoryOptions,
  typeOptions,
  shippingProfileOptions,
  salesChannelOptions,
} from "../lib/mock-data";
import {
  createEmptyOptionDefinition,
  createOptionValueDefinition,
  reconcileVariantRows,
  isPublishReady,
  validateCreateProduct,
} from "../lib/product-utils";
import { slugify } from "../lib/utils";
import { ProductsListPage } from "./products-list";
import type {
  CreateProductFormValues,
  CreateProductErrors,
  ProductAttribute,
  ProductOptionDefinition,
  ProductVariant,
} from "../types";

const defaultCreateProductValues: CreateProductFormValues = {
  title: "",
  handle: "",
  subtitle: "",
  description: "",
  discountable: true,
  type: "",
  collection: "",
  categories: [],
  tags: "",
  media: "",
  shippingProfile: "Default Shipping Profile",
  salesChannels: ["Default Sales Channel"],
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
  const [values, setValues] = useState<CreateProductFormValues>(defaultCreateProductValues);
  const [attributes, setAttributes] = useState<ProductAttribute[]>([{ key: "", value: "" }]);
  const [errors, setErrors] = useState<CreateProductErrors>({});
  const [optionDefinitions, setOptionDefinitions] = useState<ProductOptionDefinition[]>([]);
  const [optionValueDrafts, setOptionValueDrafts] = useState<Record<string, string>>({});
  const [activeStep, setActiveStep] = useState<"details" | "organize" | "variants">("details");
  const [variantRows, setVariantRows] = useState<ProductVariant[]>(() =>
    reconcileVariantRows([], defaultCreateProductValues, []),
  );
  const stepOrder = ["details", "organize", "variants"] as const;
  const activeStepIndex = stepOrder.indexOf(activeStep);
  const isLastStep = activeStep === "variants";
  const effectiveVariantRows = useMemo(
    () => reconcileVariantRows(variantRows, values, optionDefinitions),
    [optionDefinitions, values, variantRows],
  );
  const publishReady = isPublishReady(values, effectiveVariantRows, optionDefinitions);

  useEffect(() => {
    setVariantRows((current) => reconcileVariantRows(current, values, optionDefinitions));
  }, [optionDefinitions, values.hasVariants, values.inventory]);

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

  function toggleCategory(category: string) {
    setValues((current) => ({
      ...current,
      categories: current.categories.includes(category)
        ? current.categories.filter((value) => value !== category)
        : [...current.categories, category],
    }));
  }

  function toggleSalesChannel(channel: string) {
    setValues((current) => ({
      ...current,
      salesChannels: current.salesChannels.includes(channel)
        ? current.salesChannels.filter((value) => value !== channel)
        : [...current.salesChannels, channel],
    }));
  }

  function clearErrors() {
    setErrors({});
  }

  function getStepErrors(step: "details" | "organize" | "variants", nextErrors: CreateProductErrors) {
    const stepKeys: Record<typeof step, string[]> = {
      details: ["title", "handle", "attributes", "optionDefinitions", "form"],
      organize: ["form"],
      variants: ["variants", "publish", "form"],
    };

    return Object.fromEntries(
      Object.entries(nextErrors).filter(([key]) => stepKeys[step].includes(key)),
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
    setOptionDefinitions((current) => current.filter((option) => option.id !== optionId));
    setOptionValueDrafts((current) => {
      const next = { ...current };
      delete next[optionId];
      return next;
    });
  }

  function updateOptionDefinition(optionId: string, title: string) {
    setOptionDefinitions((current) =>
      current.map((option) => (option.id === optionId ? { ...option, title } : option)),
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

        const existing = new Set(option.values.map((value) => value.value.toLowerCase()));
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
          ? { ...option, values: option.values.filter((value) => value.id !== valueId) }
          : option,
      ),
    );
  }

  function toggleOptionValueEnabled(optionId: string, valueId: string) {
    setOptionDefinitions((current) =>
      current.map((option) =>
        option.id === optionId
          ? {
              ...option,
              values: option.values.map((value) =>
                value.id === valueId ? { ...value, enabled: !value.enabled } : value,
              ),
            }
          : option,
      ),
    );
  }

  function moveOptionValue(optionId: string, valueId: string, direction: "up" | "down") {
    setOptionDefinitions((current) =>
      current.map((option) => {
        if (option.id !== optionId) {
          return option;
        }

        const index = option.values.findIndex((value) => value.id === valueId);
        if (index < 0) {
          return option;
        }

        const targetIndex = direction === "up" ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= option.values.length) {
          return option;
        }

        const nextValues = [...option.values];
        [nextValues[index], nextValues[targetIndex]] = [nextValues[targetIndex], nextValues[index]];
        return {
          ...option,
          values: nextValues,
        };
      }),
    );
  }

  function updateVariantRow(index: number, key: keyof ProductVariant, nextValue: string | number | boolean) {
    setVariantRows((current) =>
      current.map((variant, currentIndex) =>
        currentIndex === index ? { ...variant, [key]: nextValue } : variant,
      ),
    );
  }

  function buildVariantSignature(options: { option: string; value: string }[]) {
    if (options.length === 0) {
      return "__default__";
    }
    return options.map((option) => `${option.option}:${option.value}`).join("|");
  }

  return (
    <>
      <ProductsListPage />
      <FocusModal open onOpenChange={(open) => {
        if (!open) {
          navigate("/products");
        }
      }}>
        <FocusModal.Content className="max-w-[calc(100vw-16px)] md:inset-6">
          <FocusModal.Header>
            <div className="min-w-0">
              <FocusModal.Title>Create Product</FocusModal.Title>
              <FocusModal.Description className="mt-1">
                Create products with Medusa-like tab purposes: define identity and options in Details, metadata in Organize, and prices in Variants.
              </FocusModal.Description>
            </div>
          </FocusModal.Header>

          <FocusModal.Body className="overflow-y-auto">
            <div className="px-6 py-6">
              {errors.form ? <InlineError message={errors.form} /> : null}
              {errors.publish ? <InlineError message={errors.publish} /> : null}

              <Tabs value={activeStep} onValueChange={(value) => goToStep(value as "details" | "organize" | "variants")}>
                <div className="border-b border-ui-border-base pb-4">
                  <Tabs.List>
                    {stepOrder.map((step) => {
                      const stepLabel = step === "details" ? "Details" : step === "organize" ? "Organize" : "Variants";
                      return (
                        <Tabs.Trigger key={step} value={step}>
                          {stepLabel}
                        </Tabs.Trigger>
                      );
                    })}
                  </Tabs.List>
                </div>

                <div className="pt-6">
                  <Tabs.Content value="details" className="space-y-8">
                    <div className="space-y-5">
                      <div>
                        <Heading level="h2">General</Heading>
                        <Text size="small" className="mt-1 text-ui-fg-subtle">
                          Core product identity, handle, media, and merchandising copy.
                        </Text>
                      </div>

                      <div className="grid gap-5 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="product-title">Title</Label>
                          <Input
                            id="product-title"
                            value={values.title}
                            onChange={(event) => setValue("title", event.target.value)}
                            placeholder="Winter jacket"
                          />
                          {errors.title ? <Text size="small" className="text-rose-700">{errors.title}</Text> : null}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="product-handle">Handle</Label>
                          <div className="flex items-center rounded-md border border-ui-border-base bg-ui-bg-field px-2 shadow-buttons-neutral">
                            <Text size="small" className="px-1 text-ui-fg-muted">/</Text>
                            <Input
                              id="product-handle"
                              value={values.handle}
                              onChange={(event) => setValue("handle", event.target.value)}
                              className="border-0 bg-transparent shadow-none"
                              placeholder="winter-jacket"
                            />
                          </div>
                          {errors.handle ? (
                            <Text size="small" className="text-rose-700">{errors.handle}</Text>
                          ) : (
                            <Text size="small" className="text-ui-fg-subtle">Leave blank to generate it from the title.</Text>
                          )}
                        </div>
                      </div>

                      <div className="grid gap-5 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="product-subtitle">Subtitle</Label>
                          <Input
                            id="product-subtitle"
                            value={values.subtitle}
                            onChange={(event) => setValue("subtitle", event.target.value)}
                            placeholder="Warm and cosy"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="product-media">Media URLs</Label>
                          <Input
                            id="product-media"
                            value={values.media}
                            onChange={(event) => setValue("media", event.target.value)}
                            placeholder="https://cdn.example.com/hero.jpg"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="product-description">Description</Label>
                        <Textarea
                          id="product-description"
                          value={values.description}
                          onChange={(event) => setValue("description", event.target.value)}
                          placeholder="A warm and cozy jacket"
                        />
                      </div>
                    </div>

                    <div className="rounded-lg border border-ui-border-base px-4 py-4">
                      <div className="flex items-start gap-4">
                        <Switch checked={values.hasVariants} onCheckedChange={(checked) => setValue("hasVariants", checked)} />
                        <div>
                          <Heading level="h3">Yes, this is a product with variants</Heading>
                          <Text className="mt-1 text-ui-fg-subtle">When unchecked, we will create a default variant for you</Text>
                        </div>
                      </div>
                    </div>

                    {values.hasVariants ? (
                      <div className="space-y-5">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <Heading level="h2">Product options</Heading>
                            <Text size="small" className="mt-1 text-ui-fg-subtle">
                              Define the options for the product, e.g. color, size, etc.
                            </Text>
                          </div>
                          <Button type="button" variant="secondary" onClick={addOptionDefinition}>
                            Add
                          </Button>
                        </div>

                        {optionDefinitions.length === 0 ? (
                          <div className="rounded-lg border border-dashed border-ui-border-base px-4 py-5">
                            <Text size="small" className="text-ui-fg-subtle">
                              Add your first product option to start generating variant rows.
                            </Text>
                          </div>
                        ) : null}

                        <div className="space-y-4">
                          {optionDefinitions.map((option) => (
                            <div key={option.id} className="rounded-xl border border-ui-border-base p-4">
                              <div className="grid gap-4 lg:grid-cols-[84px_minmax(0,1fr)_32px]">
                                <div className="space-y-6 pt-2">
                                  <Text weight="plus" size="small">Title</Text>
                                  <Text weight="plus" size="small">Values</Text>
                                </div>
                                <div className="space-y-3">
                                  <Input
                                    value={option.title}
                                    onChange={(event) => updateOptionDefinition(option.id, event.target.value)}
                                    placeholder="Color"
                                  />
                                  <div className="rounded-md border border-ui-border-base bg-ui-bg-field px-3 py-2 shadow-buttons-neutral">
                                    <div className="flex flex-wrap gap-2">
                                      {option.values.map((value) => (
                                        <Badge key={value.id} color={value.enabled ? "blue" : "grey"}>
                                          {value.value}
                                          <button
                                            type="button"
                                            className="ml-1 inline-flex"
                                            onClick={() => removeOptionValue(option.id, value.id)}
                                            aria-label={`Remove ${value.value}`}
                                          >
                                            <X className="size-3" />
                                          </button>
                                        </Badge>
                                      ))}
                                      <input
                                        value={optionValueDrafts[option.id] ?? ""}
                                        onChange={(event) => setOptionDraftValue(option.id, event.target.value)}
                                        onBlur={() => appendOptionValue(option.id)}
                                        onKeyDown={(event) => {
                                          if (event.key === "Enter" || event.key === ",") {
                                            event.preventDefault();
                                            appendOptionValue(option.id);
                                          }
                                        }}
                                        className="min-w-[180px] flex-1 border-0 bg-transparent text-sm outline-none placeholder:text-ui-fg-muted"
                                        placeholder={option.values.length > 0 ? "Add another value" : "Red, Blue, Green"}
                                      />
                                    </div>
                                  </div>
                                </div>
                                <div className="flex justify-end pt-1">
                                  <button type="button" onClick={() => removeOptionDefinition(option.id)} className="text-ui-fg-muted transition hover:text-ui-fg-base" aria-label="Remove option">
                                    <X className="size-5" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>

                        {errors.optionDefinitions ? <InlineError message={errors.optionDefinitions} /> : null}

                        <div className="space-y-4 pt-2">
                          <div>
                            <Heading level="h2">Product variants</Heading>
                            <Text size="small" className="mt-1 text-ui-fg-subtle">
                              This ranking will affect the variants&apos; order in your storefront.
                            </Text>
                          </div>

                          <div className="space-y-4">
                            {optionDefinitions
                              .filter((option) => option.values.length > 0 || option.title.trim() !== "")
                              .map((option) => (
                                <div key={option.id} className="overflow-hidden rounded-xl border border-ui-border-base">
                                  <div className="flex items-center gap-3 border-b border-ui-border-base px-4 py-4">
                                    <Checkbox checked={true} disabled />
                                    <Text weight="plus">{option.title || "Untitled option"}</Text>
                                  </div>
                                  <div>
                                    {option.values.map((value, valueIndex) => (
                                      <div key={value.id} className="flex items-center gap-3 border-b border-ui-border-base px-4 py-4 last:border-b-0">
                                        <Checkbox
                                          checked={value.enabled}
                                          onCheckedChange={() => toggleOptionValueEnabled(option.id, value.id)}
                                        />
                                        <GripVertical className="size-4 text-ui-fg-muted" />
                                        <div className="min-w-0 flex-1">
                                          <Text weight="plus" className={value.enabled ? "" : "text-ui-fg-muted"}>
                                            {value.value}
                                          </Text>
                                        </div>
                                        <div className="flex gap-2">
                                          <Button
                                            type="button"
                                            variant="transparent"
                                            size="small"
                                            disabled={valueIndex === 0}
                                            onClick={() => moveOptionValue(option.id, value.id, "up")}
                                          >
                                            ↑
                                          </Button>
                                          <Button
                                            type="button"
                                            variant="transparent"
                                            size="small"
                                            disabled={valueIndex === option.values.length - 1}
                                            onClick={() => moveOptionValue(option.id, value.id, "down")}
                                          >
                                            ↓
                                          </Button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ))}
                          </div>
                        </div>
                      </div>
                    ) : null}

                    <div className="space-y-4 border-t border-ui-border-base pt-6">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <Heading level="h2">Attributes</Heading>
                          <Text size="small" className="mt-1 text-ui-fg-subtle">
                            Optional product properties that do not affect variant generation.
                          </Text>
                        </div>
                        <Button type="button" variant="secondary" onClick={addAttributeRow}>
                          Add attribute
                        </Button>
                      </div>
                      <div className="space-y-3">
                        {attributes.map((attribute, index) => (
                          <div key={`${index}-${attribute.key}`} className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
                            <Input
                              value={attribute.key}
                              onChange={(event) => updateAttribute(index, "key", event.target.value)}
                              placeholder="Material"
                            />
                            <Input
                              value={attribute.value}
                              onChange={(event) => updateAttribute(index, "value", event.target.value)}
                              placeholder="Cotton blend"
                            />
                            <Button type="button" variant="secondary" onClick={() => removeAttributeRow(index)} disabled={attributes.length === 1}>
                              Remove
                            </Button>
                          </div>
                        ))}
                        {errors.attributes ? <InlineError message={errors.attributes} /> : null}
                      </div>
                    </div>
                  </Tabs.Content>

                  <Tabs.Content value="organize" className="space-y-8">
                    <div>
                      <Heading level="h2">Organize</Heading>
                      <Text size="small" className="mt-1 text-ui-fg-subtle">
                        Catalog metadata and operational settings separate from variant pricing.
                      </Text>
                    </div>

                    <div className="rounded-lg border border-ui-border-base px-4 py-4">
                      <div className="flex items-start gap-4">
                        <Switch checked={values.discountable} onCheckedChange={(checked) => setValue("discountable", checked)} />
                        <div>
                          <Heading level="h3">Discountable</Heading>
                          <Text size="small" className="mt-1 text-ui-fg-subtle">
                            When unchecked, discounts will not be applied to this product.
                          </Text>
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-5 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Type</Label>
                        <Select value={values.type} onValueChange={(value) => setValue("type", value)}>
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
                        <Select value={values.collection} onValueChange={(value) => setValue("collection", value)}>
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
                          onChange={(event) => setValue("tags", event.target.value)}
                          placeholder="summer, drop"
                        />
                        <Text size="small" className="text-ui-fg-subtle">Comma separated.</Text>
                      </div>
                      <div className="space-y-2">
                        <Label>Shipping profile</Label>
                        <Select value={values.shippingProfile} onValueChange={(value) => setValue("shippingProfile", value)}>
                          <Select.Trigger>
                            <Select.Value placeholder="Select shipping profile" />
                          </Select.Trigger>
                          <Select.Content>
                            {shippingProfileOptions.map((option) => (
                              <Select.Item key={option} value={option}>
                                {option}
                              </Select.Item>
                            ))}
                          </Select.Content>
                        </Select>
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

                    <div className="space-y-3">
                      <div>
                        <Label>Sales channels</Label>
                        <Text size="small" className="mt-1 text-ui-fg-subtle">
                          This product will only be available in the default sales channel if left untouched.
                        </Text>
                      </div>
                      <div className="space-y-3">
                        {salesChannelOptions.map((channel) => (
                          <label key={channel} className="flex items-center gap-3">
                            <Checkbox
                              checked={values.salesChannels.includes(channel)}
                              onCheckedChange={() => toggleSalesChannel(channel)}
                            />
                            <Text>{channel}</Text>
                          </label>
                        ))}
                      </div>
                    </div>
                  </Tabs.Content>

                  <Tabs.Content value="variants" className="space-y-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <Heading level="h2">Product variants</Heading>
                        <Text size="small" className="mt-1 text-ui-fg-subtle">
                          Enter variant prices and operational data directly on each row.
                        </Text>
                      </div>
                      <div className="flex gap-2">
                        <Button type="button" variant="secondary">View</Button>
                        <Button type="button" variant="secondary">Shortcuts</Button>
                      </div>
                    </div>

                    {errors.variants ? <InlineError message={errors.variants} /> : null}

                    <div className="overflow-x-auto">
                      <Table>
                        <Table.Header>
                          <Table.Row>
                            <Table.HeaderCell>Variant</Table.HeaderCell>
                            <Table.HeaderCell>SKU</Table.HeaderCell>
                            <Table.HeaderCell>Managed inventory</Table.HeaderCell>
                            <Table.HeaderCell>Allow backorder</Table.HeaderCell>
                            <Table.HeaderCell>Inventory kit</Table.HeaderCell>
                            <Table.HeaderCell>Price USD</Table.HeaderCell>
                            <Table.HeaderCell>Inventory</Table.HeaderCell>
                          </Table.Row>
                        </Table.Header>
                        <Table.Body>
                          {effectiveVariantRows.map((variant, index) => (
                            <Table.Row key={buildVariantSignature(variant.options)} className="align-top">
                              <Table.Cell className="py-4">
                                <div className="min-w-[180px]">
                                  <Input
                                    value={variant.title}
                                    onChange={(event) => updateVariantRow(index, "title", event.target.value)}
                                    placeholder="Default variant"
                                  />
                                  <Text size="small" className="mt-2 text-ui-fg-subtle">
                                    {variant.options.length > 0
                                      ? variant.options.map((option) => `${option.option}: ${option.value}`).join(" • ")
                                      : "Default option value"}
                                  </Text>
                                </div>
                              </Table.Cell>
                              <Table.Cell className="py-4">
                                <Input
                                  value={variant.sku}
                                  onChange={(event) => updateVariantRow(index, "sku", event.target.value)}
                                  placeholder="SKU"
                                />
                              </Table.Cell>
                              <Table.Cell className="py-4">
                                <div className="flex justify-center pt-1">
                                  <Switch checked={variant.manageInventory} onCheckedChange={(checked) => updateVariantRow(index, "manageInventory", checked)} />
                                </div>
                              </Table.Cell>
                              <Table.Cell className="py-4">
                                <div className="flex justify-center pt-1">
                                  <Switch checked={variant.allowBackorder} onCheckedChange={(checked) => updateVariantRow(index, "allowBackorder", checked)} />
                                </div>
                              </Table.Cell>
                              <Table.Cell className="py-4">
                                <div className="flex justify-center pt-1">
                                  <Switch checked={variant.hasInventoryKit} onCheckedChange={(checked) => updateVariantRow(index, "hasInventoryKit", checked)} />
                                </div>
                              </Table.Cell>
                              <Table.Cell className="py-4">
                                <div className="flex min-w-[140px] items-center rounded-md border border-ui-border-base bg-ui-bg-field px-2 shadow-buttons-neutral">
                                  <Text size="small" className="px-1 text-ui-fg-muted">$</Text>
                                  <Input
                                    value={variant.price === 0 ? "" : String(variant.price)}
                                    onChange={(event) => updateVariantRow(index, "price", Number(event.target.value || 0))}
                                    type="number"
                                    className="border-0 bg-transparent shadow-none"
                                    placeholder="0"
                                  />
                                </div>
                              </Table.Cell>
                              <Table.Cell className="py-4">
                                <Input
                                  value={String(variant.inventory)}
                                  onChange={(event) => updateVariantRow(index, "inventory", Number(event.target.value || 0))}
                                  type="number"
                                  placeholder="0"
                                />
                              </Table.Cell>
                            </Table.Row>
                          ))}
                        </Table.Body>
                      </Table>
                    </div>
                  </Tabs.Content>
                </div>
              </Tabs>
            </div>
          </FocusModal.Body>

          <FocusModal.Footer className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-4">
              <Text size="small" className="text-ui-fg-subtle">
                Handle: <span className="text-ui-fg-base">{values.handle.trim() || slugify(values.title || "new-product")}</span>
              </Text>
              <Text size="small" className="text-ui-fg-subtle">
                Variants: <span className="text-ui-fg-base">{String(effectiveVariantRows.length)}</span>
              </Text>
              <Text size="small" className="text-ui-fg-subtle">
                Publish: <span className="text-ui-fg-base">{publishReady.ready ? "Ready" : "Needs review"}</span>
              </Text>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button type="button" variant="secondary" onClick={() => navigate("/products")}>
                Cancel
              </Button>
              <Button type="button" variant="secondary" onClick={() => submit("draft")}>
                Save as draft
              </Button>
              <Button type="button" onClick={isLastStep ? () => submit("publish") : continueToNextStep}>
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
