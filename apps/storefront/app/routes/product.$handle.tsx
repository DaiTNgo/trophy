import type {
  CustomizationFormField,
  DynamicFontFamily,
  ImageShapeFieldValue,
  ProductCustomization,
} from "@trophy/customization";
import {
  ProductCustomizationForm,
  ProductCustomizationPreview,
} from "@trophy/customization-react";
import { useEffect, useMemo, useState } from "react";
import { useLoaderData } from "react-router";
import { Minus, Plus } from "lucide-react";
import { validateCustomizationValues } from "@trophy/customization";
import { ProductBreadcrumbs } from "../components/product/ProductBreadcrumbs";
import { ProductGallery } from "../components/product/ProductGallery";
import { ProductDetailSections, ProductInfo } from "../components/product/ProductInfo";
import { ProductMobileActionBar } from "../components/product/ProductMobileActionBar";
import {
  buildProductCustomizationTemplate,
  mergeCustomizationValues,
} from "../lib/product-customization";
import { useCart } from "../hooks/use-cart";
import { formatCurrency } from "../lib/utils";
import { getLocalized } from "../lib/translation";
import {
  fetchStorefrontDynamicFonts,
  fetchStorefrontProduct,
  type StorefrontDetailResponse,
} from "../lib/api";
import type { Route } from "./+types/product.$handle";
import { getLocaleFromRequest } from "../lib/locale";

const BACKEND_URL =
  (import.meta.env.VITE_BACKEND_URL as string | undefined)?.replace(/\/$/, "") ??
  "http://localhost:8787";

export async function loader({ params, request }: Route.LoaderArgs) {
  const locale = getLocaleFromRequest(request);
  const product = await fetchStorefrontProduct(params.handle, locale);
  const dynamicFonts = product.customization
    ? await fetchStorefrontDynamicFonts()
    : [];

  return { product, dynamicFonts, locale };
}

export function meta({ loaderData }: Route.MetaArgs) {
  const title = getLocalized(loaderData?.product?.title, loaderData?.locale || 'vi') || "Sản Phẩm";
  return [{ title: `${title} | TROPHY PRESTIGE` }];
}

export default function ProductDetail() {
  const { product, dynamicFonts, locale } = useLoaderData<typeof loader>();
  const { addLine } = useCart();
  const defaultVariantId =
    product.variants.find((variant) => variant.isDefault && variant.priceAmount !== null)?.id ??
    product.variants.find((variant) => variant.priceAmount !== null)?.id ??
    product.variants.find((variant) => variant.isDefault)?.id ??
    product.variants[0]?.id ??
    null;
  const [selectedVariantId, setSelectedVariantId] = useState<number | null>(defaultVariantId);
  const [message, setMessage] = useState("");
  const [cartMessage, setCartMessage] = useState("");
  const [uploadingFieldId, setUploadingFieldId] = useState("");
  const [quantity, setQuantity] = useState(1);

  const selectedVariant =
    product.variants.find((variant) => variant.id === selectedVariantId) ??
    product.variants.find((variant) => variant.id === defaultVariantId) ??
    null;
  const displayPrice = formatCurrency(selectedVariant?.priceAmount ?? null);

  const customization = useMemo<ProductCustomization | null>(() => {
    if (!product.customization?.enabled) return null;
    return {
      productId: String(product.id),
      enabled: true,
      canvasWidthPx: product.customization.canvasWidthPx,
      canvasHeightPx: product.customization.canvasHeightPx,
      layers: product.customization.layers as ProductCustomization["layers"],
      formFields: product.customization.formFields as ProductCustomization["formFields"],
    };
  }, [product]);

  const customizationTemplate = useMemo(
    () =>
      customization
        ? buildProductCustomizationTemplate({
            productId: product.id,
            productTitle: getLocalized(product.title, locale),
            customization,
            selectedVariant,
          })
        : null,
    [customization, product.id, getLocalized(product.title, locale), selectedVariant],
  );

  const [customizationValues, setCustomizationValues] = useState(() =>
    customizationTemplate ? mergeCustomizationValues(customizationTemplate, null) : {},
  );

  useEffect(() => {
    if (!customizationTemplate) return;
    setCustomizationValues((current) => mergeCustomizationValues(customizationTemplate, current));
  }, [customizationTemplate]);

  const customizationValidation = useMemo(
    () => customizationTemplate ? validateCustomizationValues({ template: customizationTemplate, values: customizationValues }) : null,
    [customizationTemplate, customizationValues],
  );

  const specs = useMemo(
    () =>
      product.attributes.reduce(
        (acc, attribute) => {
          acc[attribute.name] = attribute.unit ? `${attribute.value} ${attribute.unit}` : attribute.value;
          return acc;
        },
        {} as Record<string, string>,
      ),
    [product.attributes],
  );

  const selectedOptionValueIds = new Map(
    selectedVariant?.optionValues.map((optionValue) => [optionValue.optionId, optionValue.id]) ?? [],
  );
  const visibleOptions = product.options
    .map((option) => ({
      ...option,
      values: [...option.values].sort((a, b) => a.position - b.position),
    }))
    .sort((a, b) => a.position - b.position)
    .filter((option) => option.values.length > 1);

  function variantMatchesSelection(
    variant: StorefrontProductDetail["variants"][number],
    selectedValues: Map<number, number>,
  ) {
    return Array.from(selectedValues.entries()).every(([optionId, valueId]) =>
      variant.optionValues.some((optionValue) => optionValue.optionId === optionId && optionValue.id === valueId),
    );
  }

  function findVariantForOptionValue(optionId: number, valueId: number) {
    const nextSelection = new Map(selectedOptionValueIds);
    nextSelection.set(optionId, valueId);
    return (
      product.variants.find((variant) => variantMatchesSelection(variant, nextSelection)) ??
      product.variants.find((variant) =>
        variant.optionValues.some((optionValue) => optionValue.optionId === optionId && optionValue.id === valueId),
      ) ??
      null
    );
  }

  const optionGroups = visibleOptions.map((option) => (
    <div key={option.id} className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[clamp(20px,2vw,26px)] font-normal leading-tight text-[#2d4056]">
          {option.title}
        </p>
        <span className="text-sm text-[#7b6b5f]">
          {option.values.find((value) => selectedOptionValueIds.get(option.id) === value.id)?.value ?? "Select"}
        </span>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {option.values.map((value) => {
          const nextVariant = findVariantForOptionValue(option.id, value.id);
          const selected = selectedOptionValueIds.get(option.id) === value.id;
          const disabled = !nextVariant;
          return (
            <button
              key={value.id}
              type="button"
              disabled={disabled}
              data-option-id={option.id}
              data-option-value-id={value.id}
              data-selected={selected}
              onClick={() => {
                if (nextVariant) setSelectedVariantId(nextVariant.id);
              }}
              className={`min-h-14 rounded-none border px-4 py-3 text-left text-[clamp(18px,1.5vw,22px)] font-normal transition ${
                selected
                  ? "border-[#110023] bg-white text-black ring-2 ring-[#110023]"
                  : "border-[#d5d5d5] bg-white text-black hover:border-[#110023] hover:bg-[#fbf8f5]"
              } disabled:cursor-not-allowed disabled:opacity-40`}
            >
              {value.value}
            </button>
          );
        })}
      </div>
    </div>
  ));

  const mainMedia = selectedVariant?.media[0] ?? null;
  const galleryThumbnails = product.variants
    .filter((variant) => variant.media[0]?.contentUrl)
    .map((variant) => ({
      id: String(variant.id),
      src: variant.media[0]!.contentUrl,
      alt: `${getLocalized(product.title, locale)} - ${getLocalized(variant.title, locale)}`,
      active: variant.id === selectedVariant?.id,
      onClick: () => setSelectedVariantId(variant.id),
    }));
  const contactHref = `/contact?product=${encodeURIComponent(getLocalized(product.title, locale))}${
    selectedVariant ? `&variant=${encodeURIComponent(getLocalized(selectedVariant.title, locale))}` : ""
  }${selectedVariant?.sku ? `&sku=${encodeURIComponent(selectedVariant.sku)}` : ""}`;

  const addToCartDisabled =
    !selectedVariant ||
    selectedVariant.priceAmount === null ||
    quantity < 1 ||
    Boolean(uploadingFieldId) ||
    Boolean(customizationTemplate && customizationValidation && !customizationValidation.valid);

  const addToCartMessage = selectedVariant
    ? selectedVariant.priceAmount === null
      ? "This variant uses Contact Price and cannot be added to cart."
      : customizationTemplate && customizationValidation && !customizationValidation.valid
        ? "Complete the required customization fields before adding this item to cart."
        : cartMessage
    : "Select a variant before adding this item to cart.";

  function handleAddToCart() {
    if (!selectedVariant || selectedVariant.priceAmount === null || quantity < 1) {
      return;
    }

    if (customizationTemplate && customizationValidation && !customizationValidation.valid) {
      setCartMessage("Complete the required customization fields before adding this item to cart.");
      return;
    }

    const customizationSummary = customizationTemplate
      ? customizationTemplate.formFields
          .map((field) => {
            const value = customizationValues[field.id];
            if (!value) {
              return null;
            }

            if (typeof value === "object" && value && "text" in value && typeof value.text === "string") {
              return { fieldId: field.id, label: field.label, valueSummary: value.text };
            }

            if (typeof value === "object" && value && "assetId" in value) {
              return { fieldId: field.id, label: field.label, valueSummary: "Uploaded image" };
            }

            if (typeof value === "object" && value && "source" in value && value.source === "clipart") {
              return { fieldId: field.id, label: field.label, valueSummary: value.clipartAssetName };
            }

            return { fieldId: field.id, label: field.label, valueSummary: "Custom value" };
          })
          .filter((entry): entry is { fieldId: string; label: string; valueSummary: string } => entry !== null)
      : [];

    addLine({
      productId: product.id,
      variantId: selectedVariant.id,
      quantity,
      customizationValues: customizationTemplate ? customizationValues : null,
      customizationSummary,
      display: {
        productTitle: getLocalized(product.title, locale),
        productHandle: product.handle,
        variantTitle: getLocalized(selectedVariant.title, locale),
        sku: selectedVariant.sku,
        thumbnail: selectedVariant.media[0]?.contentUrl ?? null,
        priceAmount: selectedVariant.priceAmount,
        customizable: Boolean(customizationTemplate),
        requiresCustomization: Boolean(customizationTemplate),
        isContactPrice: selectedVariant.priceAmount === null,
      },
    });
    setCartMessage("Added to cart. You can keep browsing or open the cart.");
  }

  async function uploadCustomizationImage(
    field: CustomizationFormField,
    file: File,
  ): Promise<ImageShapeFieldValue> {
    setUploadingFieldId(field.id);
    try {
      const response = await fetch(`${BACKEND_URL}/api/storefront/customizations/assets`, {
        method: "POST",
        headers: { "Content-Type": file.type, "X-Upload-Token": getUploadToken() },
        body: file,
      });
      const payload = (await response.json()) as {
        asset?: { id: string; widthPx: number; heightPx: number; contentUrl: string };
        error?: string;
      };
      if (!response.ok || !payload.asset) {
        throw new Error(payload.error ?? "Upload failed.");
      }

      return {
        assetId: payload.asset.id,
        previewUrl: `${BACKEND_URL}${payload.asset.contentUrl}`,
        sourceWidthPx: payload.asset.widthPx,
        sourceHeightPx: payload.asset.heightPx,
        cropScale: 1,
        cropXRatio: 0,
        cropYRatio: 0,
        cropRotationDeg: 0,
      };
    } finally {
      setUploadingFieldId("");
    }
  }

  return (
    <div className="bg-white font-body-md text-on-surface selection:bg-[#f4eee8] selection:text-[#110023]">
      <main className="mx-auto max-w-[1680px] px-4 pb-28 pt-6 sm:px-6 md:px-8 md:pb-16 lg:px-10">
        <ProductBreadcrumbs title={getLocalized(product.title, locale)} />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.42fr)_minmax(400px,0.58fr)] lg:items-start">
          <ProductGallery
            customizable={Boolean(customizationTemplate)}
            mainContent={
              customizationTemplate ? (
                <div
                  className="min-h-[560px]"
                  data-selected-variant-id={selectedVariant?.id ?? ""}
                >
                  <ProductCustomizationPreview
                    template={customizationTemplate}
                    values={customizationValues}
                    dynamicFonts={dynamicFonts as DynamicFontFamily[]}
                    resolveFontUrl={(assetId) => `${BACKEND_URL}/api/storefront/brand-assets/fonts/file/${assetId}`}
                    selectedVariantId={selectedVariant?.id ?? null}
                    onImageValueChange={(fieldId, value) => {
                      setCustomizationValues((current) => ({ ...current, [fieldId]: value }));
                    }}
                  />
                </div>
              ) : mainMedia?.contentUrl ? (
                <div className="group flex min-h-[560px] items-center justify-center p-6">
                  <img
                    className="max-h-[680px] w-full object-contain transition-transform duration-700 group-hover:scale-105"
                    src={mainMedia.contentUrl}
                    alt={getLocalized(product.title, locale)}
                  />
                </div>
              ) : (
                <div className="flex min-h-[560px] items-center justify-center text-[#7b6b5f]">
                  Product image unavailable
                </div>
              )
            }
            thumbnails={galleryThumbnails}
          />
          <ProductInfo
            title={getLocalized(product.title, locale)}
            price={displayPrice}
            rating={5}
            reviewsCount={0}
            variantSelector={
              product.variants.length > 0 ? (
                <div className="space-y-8">
                  {optionGroups.length > 0 ? (
                    <div className="space-y-8">
                      <div className="flex items-center justify-between gap-4">
                        <h2 className="text-[clamp(20px,2vw,26px)] font-normal leading-tight text-[#2d4056]">Options</h2>
                        {selectedVariant?.sku ? (
                          <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[#7b6b5f]">
                            SKU {selectedVariant.sku}
                          </span>
                        ) : null}
                      </div>
                      {optionGroups}
                    </div>
                  ) : null}
                  <div className="space-y-2">
                    <label className="block text-[clamp(20px,2vw,26px)] font-normal leading-tight text-[#2d4056]">Quantity</label>
                    <div className="inline-flex h-14 items-center overflow-hidden border border-[#d5d5d5] bg-white">
                      <button
                        type="button"
                        aria-label="Decrease quantity"
                        className="h-full px-4 text-[#2d4056] transition hover:bg-[#fbf8f5]"
                        onClick={() => setQuantity((current) => Math.max(1, current - 1))}
                      >
                        <Minus className="size-4" />
                      </button>
                      <input
                        type="number"
                        min={1}
                        value={quantity}
                        onChange={(event) => {
                          const nextValue = Number(event.target.value);
                          setQuantity(Number.isFinite(nextValue) && nextValue > 0 ? Math.min(99, nextValue) : 1);
                        }}
                        className="h-full w-16 border-x border-[#d5d5d5] bg-white px-3 text-center text-[clamp(18px,1.5vw,22px)] outline-none"
                      />
                      <button
                        type="button"
                        aria-label="Increase quantity"
                        className="h-full px-4 text-[#2d4056] transition hover:bg-[#fbf8f5]"
                        onClick={() => setQuantity((current) => Math.min(99, current + 1))}
                      >
                        <Plus className="size-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ) : null
            }
            customizationSection={
              customizationTemplate ? (
                <div className="space-y-8">
                  <ProductCustomizationForm
                    template={customizationTemplate}
                    values={customizationValues}
                    dynamicFonts={dynamicFonts as DynamicFontFamily[]}
                    message={message}
                    onMessageChange={setMessage}
                    onUploadImage={uploadCustomizationImage}
                    onValueChange={(fieldId, value) => {
                      setCustomizationValues((current) => ({ ...current, [fieldId]: value }));
                    }}
                  />
                </div>
              ) : null
            }
            isContactPrice={selectedVariant?.priceAmount === null}
            contactHref={contactHref}
            primaryActionLabel="Add to Cart"
            primaryActionDisabled={addToCartDisabled}
            primaryActionMessage={addToCartMessage}
            onPrimaryAction={handleAddToCart}
            flatCustomization={Boolean(customizationTemplate)}
          />
        </div>
        <ProductMobileActionBar
          price={displayPrice}
          label="Add to Cart"
          disabled={addToCartDisabled}
          onClick={handleAddToCart}
          contactHref={selectedVariant?.priceAmount === null ? contactHref : undefined}
        />
        <ProductDetailSections
          description={getLocalized(product.description, locale) || ""}
          specs={specs}
        />
      </main>
    </div>
  );
}

function getUploadToken() {
  const storageKey = "trophy-customization-upload-token";
  const existing = window.sessionStorage.getItem(storageKey);
  if (existing) return existing;
  const token = crypto.randomUUID();
  window.sessionStorage.setItem(storageKey, token);
  return token;
}

export type StorefrontProductDetail = StorefrontDetailResponse["item"];
