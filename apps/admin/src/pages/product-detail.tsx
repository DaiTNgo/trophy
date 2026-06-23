import { useEffect, useMemo, useState, startTransition } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { TextField } from "../components/ui/medusa";
import { TextAreaField } from "../components/ui/medusa/text-area-field";
import { SelectField } from "../components/ui/medusa/select-field";
import { StatusBadge } from "../components/ui/medusa/status-badge";
import { InlineError } from "../components/ui/medusa/inline-error";
import { PageHeader, SectionCard, ChecklistItem, SummaryRow } from "../components/ui/medusa";
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
  validateCreateProduct,
} from "../lib/product-utils";
import { derivePublishedStatus } from "../lib/product-utils";
import { formatCurrency } from "../lib/utils";
import type {
  CreateProductFormValues,
  CreateProductErrors,
  CreateProductSubmission,
  ProductAttribute,
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

export function ProductDetailPage() {
  const { productId } = useParams();
  const { products, updateProduct } = useCatalog();
  const navigate = useNavigate();
  const product = products.find((entry) => entry.id === productId);
  const [errors, setErrors] = useState<CreateProductErrors>({});

  const [values, setValues] = useState<CreateProductFormValues>(() =>
    product ? productToFormValues(product) : defaultCreateProductValues,
  );
  const [attributes, setAttributes] = useState<ProductAttribute[]>(() =>
    product && product.attributes.length > 0 ? product.attributes : [{ key: "", value: "" }],
  );

  useEffect(() => {
    if (!product) {
      return;
    }

    setValues(productToFormValues(product));
    setAttributes(product.attributes.length > 0 ? product.attributes : [{ key: "", value: "" }]);
  }, [product]);

  const variantPreview = useMemo(() => buildVariantPreview(values), [values]);
  const publishReady = isPublishReady(values, variantPreview);

  if (!product) {
    return (
      <section className="space-y-6">
        <PageHeader
          eyebrow="Products"
          title="Product not found"
          description="The requested product does not exist in the current mock catalog."
          actions={
            <Link
              to="/products"
              className="inline-flex items-center rounded-full border border-stone-300 bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition hover:border-stone-400"
            >
              Back to products
            </Link>
          }
        />
      </section>
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

  function toggleCategory(category: string) {
    setValues((current) => ({
      ...current,
      categories: current.categories.includes(category)
        ? current.categories.filter((value) => value !== category)
        : [...current.categories, category],
    }));
  }

  function save(mode: "draft" | "publish") {
    const submission: CreateProductSubmission = {
      mode,
      values,
      attributes,
      variantRows: variantPreview,
    };

    const nextErrors = validateCreateProduct({
      mode,
      values,
      attributes,
      products: products.filter((entry) => entry.id !== currentProduct.id),
      variantRows: variantPreview,
    });

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

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
  }

  return (
    <section className="space-y-6">
      <PageHeader
        eyebrow="Products"
        title={currentProduct.title}
        description="Section-based editing workspace for overview, organize, descriptive fields, and variant-owned pricing."
        actions={
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              to="/products"
              className="rounded-full border border-stone-300 bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition hover:border-stone-400"
            >
              Back to products
            </Link>
            <button
              type="button"
              onClick={() => save("draft")}
              className="rounded-full border border-stone-300 bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition hover:border-stone-400"
            >
              Save changes
            </button>
            <button
              type="button"
              onClick={() => save("publish")}
              className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Publish
            </button>
          </div>
        }
      />

      {errors.form ? <InlineError message={errors.form} /> : null}
      {errors.publish ? <InlineError message={errors.publish} /> : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <SectionCard title="Overview" description="Edit the core identity and descriptive content shown for this product.">
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
          </SectionCard>

          <SectionCard title="Organize" description="Control collection placement, category assignment, and tags.">
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
            <div>
              <p className="mb-3 text-sm font-medium text-slate-700">Categories</p>
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
                          ? "border-amber-300 bg-amber-50 text-amber-900"
                          : "border-stone-200 bg-stone-50 text-slate-700 hover:border-stone-300",
                      ].join(" ")}
                    >
                      {category}
                    </button>
                  );
                })}
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Media and attributes" description="Manage product-rich content that does not affect variant combinations.">
            <TextAreaField
              label="Media URLs"
              name="detail-media"
              value={values.media}
              hint="One URL per line."
              onChange={(value) => setValue("media", value)}
            />

            <div>
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-medium text-slate-700">Attributes</p>
                <button
                  type="button"
                  onClick={addAttributeRow}
                  className="rounded-full border border-stone-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-stone-300"
                >
                  Add attribute
                </button>
              </div>
              <div className="space-y-3">
                {attributes.map((attribute, index) => (
                  <div key={`${index}-${attribute.key}-${attribute.value}`} className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
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
                      <button
                        type="button"
                        onClick={() => removeAttributeRow(index)}
                        disabled={attributes.length === 1}
                        className="w-full rounded-2xl border border-stone-200 px-4 py-4 text-sm font-medium text-slate-700 transition hover:border-stone-300 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              {errors.attributes ? <p className="mt-3 text-sm text-rose-700">{errors.attributes}</p> : null}
            </div>
          </SectionCard>

          <SectionCard title="Variants and pricing" description="Variant prices remain owned by variants. Edit option structure through preview inputs.">
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
            {errors.variants ? <p className="text-sm text-rose-700">{errors.variants}</p> : null}

            <div className="rounded-3xl border border-stone-200 bg-stone-50 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-700">Variant preview</p>
                  <p className="mt-1 text-sm text-slate-500">Current detail edits generate the following sellable combinations.</p>
                </div>
                <StatusBadge status={product.status} />
              </div>
              <div className="mt-4 space-y-3">
                {variantPreview.map((variant) => (
                  <div key={variant.title} className="rounded-2xl bg-white px-4 py-3">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="font-medium text-slate-800">{variant.title}</p>
                        <p className="mt-1 text-sm text-slate-500">
                          {variant.options.length > 0
                            ? variant.options.map((option) => `${option.option}: ${option.value}`).join(" • ")
                            : "No option selections"}
                        </p>
                      </div>
                      <div className="text-right text-sm text-slate-500">
                        <p>{formatCurrency(variant.price)}</p>
                        <p>{variant.inventory} in stock</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </SectionCard>
        </div>

        <aside className="space-y-6">
          <SectionCard title="Publish status" description="Feedback aligned to Medusa-like publish gating rules.">
            <ChecklistItem label="Product title exists" complete={values.title.trim().length > 0} />
            <ChecklistItem label="Publishable price set" complete={Number(values.basePrice || 0) > 0} />
            <ChecklistItem label="Variant structure valid" complete={publishReady.variantStructureValid} />
            <ChecklistItem label="At least one category or collection assigned" complete={values.collection !== "" || values.categories.length > 0} />
          </SectionCard>
          <SectionCard title="Current record" description="Snapshot of the saved product and current edits.">
            <dl className="space-y-3 text-sm text-slate-600">
              <SummaryRow label="Handle" value={values.handle.trim() || product.handle} />
              <SummaryRow label="Saved status" value={product.status} />
              <SummaryRow label="Draft result" value="Draft" />
              <SummaryRow label="Publish result" value={derivePublishedStatus()} />
              <SummaryRow label="Variants" value={String(variantPreview.length)} />
              <SummaryRow label="Updated" value={product.updatedAt} />
            </dl>
          </SectionCard>
        </aside>
      </div>

      <datalist id="product-types">
        {typeOptions.map((option) => (
          <option key={option} value={option} />
        ))}
      </datalist>
    </section>
  );
}
