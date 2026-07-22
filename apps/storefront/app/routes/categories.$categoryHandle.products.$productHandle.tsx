import type {
  CustomizationFormValues,
  CustomizationFormField,
  CustomizationTemplate,
  DynamicFontFamily,
  ImageShapeFieldValue,
  ProductCustomization,
} from "@trophy/customization";
import {
  ProductCustomizationForm,
  ProductCustomizationPreview,
} from "@trophy/customization-react";
import { useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { useLoaderData } from "react-router";
import { ChevronDown, ChevronUp, Minus, Plus } from "lucide-react";
import { validateCustomizationValues } from "@trophy/customization";
import { ProductBreadcrumbs } from "../components/product/ProductBreadcrumbs";
import {
  ProductGallery,
  ProductGalleryThumbnails,
  type ProductGalleryThumbnail,
} from "../components/product/ProductGallery";
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
  backendFontUrl,
  backendStaticFontUrl,
  fetchStorefrontDynamicFonts,
  fetchStorefrontProduct,
  uploadStorefrontCustomizationAsset,
  type StorefrontDetailResponse,
} from "../lib/api";
import { recordRecentlyViewedProduct } from "../lib/recently-viewed";
import type { Route } from "./+types/categories.$categoryHandle.products.$productHandle";
import { getLocale } from "../i18n.server";
import { withStorefrontLoaderLog } from "../lib/observability";
import Container from "@/components/container";
import { QuantityInput } from "../components/ui/quantity-input";

export async function loader({ params, request, context }: Route.LoaderArgs) {
  return withStorefrontLoaderLog("category-product-detail", request, async () => {
    const locale = getLocale(context);
    const product = await fetchStorefrontProduct(params.productHandle, locale);
    const activeCategory =
      product.categories.find((category) => category.handle === params.categoryHandle) ?? null;

    if (!activeCategory) {
      throw new Response("Not Found", { status: 404 });
    }

    const dynamicFonts = product.customization
      ? await fetchStorefrontDynamicFonts()
      : [];

    return { product, dynamicFonts, locale, activeCategory };
  }, {
    categoryHandle: params.categoryHandle,
    productHandle: params.productHandle,
  });
}

export function meta({ loaderData }: Route.MetaArgs) {
  const title = getLocalized(loaderData?.product?.title, loaderData?.locale || 'vi') || "Sản Phẩm";
  return [{ title: `${title} | TROPHY PRESTIGE` }];
}

export default function ProductDetail() {
  const { product, dynamicFonts, locale, activeCategory } = useLoaderData<typeof loader>();
  const { addLine } = useCart();
  const previewSectionRef = useRef<HTMLDivElement | null>(null);
  const mobilePreviewSentinelRef = useRef<HTMLDivElement | null>(null);
  const mobilePreviewShellRef = useRef<HTMLDivElement | null>(null);
  const recordedRecentlyViewedProductId = useRef<number | null>(null);
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
  const [selectedMediaId, setSelectedMediaId] = useState<string | null>(null);
  const [isAtPageTop, setIsAtPageTop] = useState(true);
  const [isMobilePreviewHidden, setIsMobilePreviewHidden] = useState(false);
  const [isMobilePreviewAutoRestoreArmed, setIsMobilePreviewAutoRestoreArmed] = useState(false);
  const [mobileHiddenShellHeight, setMobileHiddenShellHeight] = useState<number | null>(null);
  const [isMobilePreviewSticky, setIsMobilePreviewSticky] = useState(false);

  const selectedVariant =
    product.variants.find((variant) => variant.id === selectedVariantId) ??
    product.variants.find((variant) => variant.id === defaultVariantId) ??
    null;
  const selectedCustomizationVariant = useMemo(
    () =>
      selectedVariant
        ? {
          ...selectedVariant,
          title: getLocalized(selectedVariant.title, locale),
        }
        : null,
    [selectedVariant, locale],
  );
  const selectedVariantMedia = useMemo(
    () =>
      [...(selectedVariant?.media ?? [])]
        .filter((media) => Boolean(media.contentUrl))
        .sort((a, b) => a.position - b.position),
    [selectedVariant],
  );
  const selectedMedia =
    selectedVariantMedia.find((media) => media.id === selectedMediaId) ?? selectedVariantMedia[0] ?? null;
  const displayPrice = formatCurrency(selectedVariant?.priceAmount ?? null);

  useEffect(() => {
    setSelectedMediaId(selectedVariantMedia[0]?.id ?? null);
  }, [selectedVariant?.id, selectedVariantMedia]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const sentinel = mobilePreviewSentinelRef.current;
    if (!sentinel || !product.customization?.enabled) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsMobilePreviewSticky(!entry.isIntersecting);
      },
      { threshold: 0 },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [product.customization?.enabled]);

  useEffect(() => {
    if (typeof window === "undefined" || !product.customization?.enabled) return;

    const handleScroll = () => {
      const scrollY = window.scrollY;
      const atTop = scrollY <= 0;
      setIsAtPageTop(atTop);
      if (isMobilePreviewHidden && !atTop && !isMobilePreviewAutoRestoreArmed) {
        setIsMobilePreviewAutoRestoreArmed(true);
      }
      if (atTop && isMobilePreviewHidden && isMobilePreviewAutoRestoreArmed) {
        setIsMobilePreviewHidden(false);
        setIsMobilePreviewAutoRestoreArmed(false);
      }
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [
    isMobilePreviewAutoRestoreArmed,
    isMobilePreviewHidden,
    product.customization?.enabled,
  ]);

  useEffect(() => {
    if (recordedRecentlyViewedProductId.current === product.id) {
      return;
    }

    recordRecentlyViewedProduct({
      productId: product.id,
      handle: product.handle,
      title: getLocalized(product.title, locale),
      thumbnail: selectedVariantMedia[0]?.contentUrl ?? null,
      priceAmount:
        product.variants.find((variant) => variant.priceAmount !== null)?.priceAmount ??
        product.variants[0]?.priceAmount ??
        null,
    });
    recordedRecentlyViewedProductId.current = product.id;
  }, [
    activeCategory.handle,
    locale,
    product.handle,
    product.id,
    product.title,
    product.variants,
    selectedVariantMedia,
  ]);

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
          selectedVariant: selectedCustomizationVariant,
          selectedMedia,
        })
        : null,
    [customization, product.id, product.title, locale, selectedCustomizationVariant, selectedMedia],
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
          const name = getLocalized(attribute.name, locale);
          const value = getLocalized(attribute.value, locale);
          acc[name] = attribute.unit ? `${value} ${attribute.unit}` : value;
          return acc;
        },
        {} as Record<string, string>,
      ),
    [product.attributes, locale],
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
    <div key={option.id} className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <p className="font-heading text-[22px] uppercase leading-none tracking-[0.02em] text-brand-strong">
          {getLocalized(option.title, locale)}
        </p>
        <span className="text-xs font-semibold uppercase tracking-[0.08em] text-on-surface-variant">
          {getLocalized(option.values.find((value) => selectedOptionValueIds.get(option.id) === value.id)?.value, locale) || "Select"}
        </span>
      </div>
      <div className="grid gap-1.5 sm:grid-cols-2">
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
              className={`h-10 rounded border px-3 text-left text-sm font-medium transition ${selected
                ? "border-brand-strong bg-white text-text-base ring-2 ring-brand-strong/15"
                : "border-border-subtle bg-white text-text-base hover:border-brand-support"
                } disabled:cursor-not-allowed disabled:opacity-40`}
            >
              {getLocalized(value.value, locale)}
            </button>
          );
        })}
      </div>
    </div>
  ));

  const mainMedia = selectedMedia;
  const galleryThumbnails = selectedVariantMedia.map((media, index) => ({
    id: media.id,
    src: media.contentUrl,
    alt: `${getLocalized(product.title, locale)} - image ${index + 1}`,
    active: media.id === selectedMedia?.id,
    onClick: () => setSelectedMediaId(media.id),
  }));
  const mobileGalleryThumbnails = galleryThumbnails as ProductGalleryThumbnail[];
  const contactHref = `/contact?product=${encodeURIComponent(getLocalized(product.title, locale))}${selectedVariant ? `&variant=${encodeURIComponent(getLocalized(selectedVariant.title, locale))}` : ""
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
      const asset = await uploadStorefrontCustomizationAsset(file, getUploadToken());

      return {
        assetId: asset.id,
        previewUrl: asset.contentUrl,
        sourceWidthPx: asset.widthPx,
        sourceHeightPx: asset.heightPx,
        cropScale: 1,
        cropXRatio: 0,
        cropYRatio: 0,
        cropRotationDeg: 0,
      };
    } finally {
      setUploadingFieldId("");
    }
  }

  const shortDescription = useMemo(() => {
    const full = getLocalized(product.description, locale) || "";
    if (full.length <= 220) return full;
    const cut = full.slice(0, 220);
    const lastPeriod = cut.lastIndexOf(".");
    return lastPeriod > 120 ? cut.slice(0, lastPeriod + 1) : cut + "…";
  }, [product.description, locale]);

  const previewNode = customizationTemplate ? (
    <ProductCustomizationPreview
      template={customizationTemplate}
      values={customizationValues}
      dynamicFonts={dynamicFonts as DynamicFontFamily[]}
      className="border-0 rounded-none h-[min(50vh,460px)] min-h-[320px] lg:h-[min(72vh,740px)] lg:min-h-[520px]"
      resolveFontUrl={backendFontUrl}
      resolveStaticFontUrl={backendStaticFontUrl}
      selectedVariantId={selectedVariant?.id ?? null}
      onImageValueChange={(fieldId, value) => {
        setCustomizationValues((current) => ({ ...current, [fieldId]: value }));
      }}
    />
  ) : null;
  const shouldShowHiddenPreviewBar = isMobilePreviewHidden && !isAtPageTop;
  const mobilePreviewShellMinHeight = shouldShowHiddenPreviewBar
    ? mobileHiddenShellHeight ?? undefined
    : undefined;

  return (
    <div className="bg-white font-body-md text-on-surface selection:bg-secondary-container selection:text-brand-strong">
      <ProductBreadcrumbs
        title={getLocalized(product.title, locale)}
        categoryTitle={getLocalized(activeCategory.name, locale)}
        categoryHandle={activeCategory.handle}
      />
      <Container
        className="pt-8"
      >
        <div ref={previewSectionRef} className="h-0" aria-hidden />
        {customizationTemplate ? (
          <>
            <div className="lg:hidden">
              <div ref={mobilePreviewSentinelRef} className="h-px" aria-hidden />
              <div
                ref={mobilePreviewShellRef}
                className="sticky top-0 z-[70]"
                style={
                  mobilePreviewShellMinHeight
                    ? { minHeight: `${mobilePreviewShellMinHeight}px` }
                    : undefined
                }
              >
                {shouldShowHiddenPreviewBar ? (
                  <div
                    className="rounded-b-2xl border border-border-subtle bg-white/96 px-4 py-3 shadow-[0_20px_48px_rgba(24,22,26,0.12)] backdrop-blur-md"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setIsMobilePreviewHidden(false);
                        setIsMobilePreviewAutoRestoreArmed(false);
                        setMobileHiddenShellHeight(null);
                      }}
                      className="flex w-full items-center justify-center gap-2 text-sm font-bold uppercase tracking-[0.1em] text-brand-strong"
                    >
                      <ChevronDown className="size-4" />
                      Show preview
                    </button>
                  </div>
                ) : (
                  <section
                    className={`overflow-hidden border border-border-subtle bg-white shadow-[0_18px_48px_rgba(24,22,26,0.08)] ${isMobilePreviewSticky
                      ? "rounded-b-2xl shadow-[0_22px_56px_rgba(24,22,26,0.12)]"
                      : "rounded-2xl"
                      }`}
                    data-selected-variant-id={selectedVariant?.id ?? ""}
                  >
                    {previewNode}
                    <ProductGalleryThumbnails thumbnails={mobileGalleryThumbnails} />
                    {isMobilePreviewSticky ? (
                      <button
                        type="button"
                        onClick={() => {
                          setMobileHiddenShellHeight(
                            mobilePreviewShellRef.current?.getBoundingClientRect().height ?? null,
                          );
                          setIsMobilePreviewHidden(true);
                          setIsMobilePreviewAutoRestoreArmed(false);
                        }}
                        className="flex w-full items-center justify-center gap-2 border-t border-border-subtle bg-white px-4 py-3 text-sm font-bold uppercase tracking-[0.1em] text-brand-strong"
                      >
                        Hide preview
                        <ChevronUp className="size-4" />
                      </button>
                    ) : null}
                  </section>
                )}
              </div>
              <div className="mt-6">
                <ProductInfo
                  title={getLocalized(product.title, locale)}
                  price={displayPrice}
                  rating={5}
                  reviewsCount={0}
                  description={shortDescription}
                  variantSelector={
                    optionGroups.length > 0 ? (
                      <div className="space-y-4">
                        {optionGroups}
                      </div>
                    ) : null
                  }
                  customizationSection={
                    <CustomizationPurchaseSection
                      template={customizationTemplate}
                      values={customizationValues}
                      dynamicFonts={dynamicFonts as DynamicFontFamily[]}
                      message={message}
                      quantity={quantity}
                      setQuantity={setQuantity}
                      onMessageChange={setMessage}
                      onUploadImage={uploadCustomizationImage}
                      onValueChange={(fieldId, value) => {
                        setCustomizationValues((current) => ({ ...current, [fieldId]: value }));
                      }}
                    />
                  }
                  isContactPrice={selectedVariant?.priceAmount === null}
                  contactHref={contactHref}
                  primaryActionLabel="Add to Cart"
                  primaryActionDisabled={addToCartDisabled}
                  primaryActionMessage={addToCartMessage}
                  previewRef={previewSectionRef}
                  onPrimaryAction={handleAddToCart}
                  flatCustomization
                />
              </div>
            </div>

            <div className="hidden grid-cols-1 gap-8 lg:grid lg:grid-cols-[minmax(0,1fr)_440px] lg:items-start xl:grid-cols-[minmax(0,1fr)_480px]">
              <ProductGallery
                customizable
                mainContent={
                  <section
                    className="min-h-[560px]"
                    data-selected-variant-id={selectedVariant?.id ?? ""}
                  >
                    <ProductCustomizationPreview
                      template={customizationTemplate}
                      values={customizationValues}
                      dynamicFonts={dynamicFonts as DynamicFontFamily[]}
                      resolveFontUrl={backendFontUrl}
                      resolveStaticFontUrl={backendStaticFontUrl}
                      selectedVariantId={selectedVariant?.id ?? null}
                      onImageValueChange={(fieldId, value) => {
                        setCustomizationValues((current) => ({ ...current, [fieldId]: value }));
                      }}
                    />
                  </section>
                }
                thumbnails={galleryThumbnails}
              />
              <ProductInfo
                title={getLocalized(product.title, locale)}
                price={displayPrice}
                rating={5}
                reviewsCount={0}
                description={shortDescription}
                variantSelector={
                  optionGroups.length > 0 ? (
                    <div className="space-y-4">
                      {optionGroups}
                    </div>
                  ) : null
                }
                customizationSection={
                  <CustomizationPurchaseSection
                    template={customizationTemplate}
                    values={customizationValues}
                    dynamicFonts={dynamicFonts as DynamicFontFamily[]}
                    message={message}
                    quantity={quantity}
                    setQuantity={setQuantity}
                    onMessageChange={setMessage}
                    onUploadImage={uploadCustomizationImage}
                    onValueChange={(fieldId, value) => {
                      setCustomizationValues((current) => ({ ...current, [fieldId]: value }));
                    }}
                  />
                }
                isContactPrice={selectedVariant?.priceAmount === null}
                contactHref={contactHref}
                primaryActionLabel="Add to Cart"
                primaryActionDisabled={addToCartDisabled}
                primaryActionMessage={addToCartMessage}
                previewRef={previewSectionRef}
                onPrimaryAction={handleAddToCart}
                flatCustomization
              />
            </div>
          </>
        ) : (
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_440px] lg:items-start xl:grid-cols-[minmax(0,1fr)_480px]">
            <ProductGallery
              mainContent={
                mainMedia?.contentUrl ? (
                  <div className="group flex min-h-[480px] items-center justify-center p-6">
                    <img
                      className="max-h-[600px] w-full object-contain transition-transform duration-700 group-hover:scale-105"
                      src={mainMedia.contentUrl}
                      alt={getLocalized(product.title, locale)}
                    />
                  </div>
                ) : (
                  <div className="flex min-h-[480px] items-center justify-center text-on-surface-variant">
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
              description={shortDescription}
              variantSelector={
                optionGroups.length > 0 ? (
                  <div className="space-y-4">
                    {optionGroups}
                  </div>
                ) : null
              }
              customizationSection={
                // <QuantityOnlySection quantity={quantity} setQuantity={setQuantity} />
                <QuantityInput
                  value={quantity}
                  min={1}
                  max={99}
                  onValueChange={(next) => setQuantity(next)}
                />
              }
              isContactPrice={selectedVariant?.priceAmount === null}
              contactHref={contactHref}
              primaryActionLabel="Add to Cart"
              primaryActionDisabled={addToCartDisabled}
              primaryActionMessage={addToCartMessage}
              previewRef={previewSectionRef}
              onPrimaryAction={handleAddToCart}
            />
          </div>
        )}
        {/*

        <ProductMobileActionBar
          price={displayPrice}
          label="Add to Cart"
          disabled={addToCartDisabled}
          onClick={handleAddToCart}
          contactHref={selectedVariant?.priceAmount === null ? contactHref : undefined}
        />
          */}
        <ProductDetailSections
          description={getLocalized(product.description, locale) || ""}
          specs={specs}
        />
      </Container>
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

function QuantityOnlySection({
  quantity,
  setQuantity,
}: {
  quantity: number;
  setQuantity: React.Dispatch<React.SetStateAction<number>>;
}) {
  return (
    <div className="space-y-2">
      <label className="block text-xs font-bold uppercase tracking-[0.12em] text-text-muted">Quantity</label>
      <div className="inline-flex h-10 items-center overflow-hidden rounded border border-border-subtle bg-white">
        <button
          type="button"
          aria-label="Decrease quantity"
          className="flex h-full w-10 items-center justify-center text-text-muted transition hover:bg-surface-subtle"
          onClick={() => setQuantity((c) => Math.max(1, c - 1))}
        >
          <Minus className="size-3.5" />
        </button>
        <input
          type="number"
          min={1}
          value={quantity}
          onChange={(event) => {
            const v = Number(event.target.value);
            setQuantity(Number.isFinite(v) && v > 0 ? Math.min(99, v) : 1);
          }}
          className="h-full w-14 border-x border-border-subtle bg-white px-2 text-center text-sm outline-none"
        />
        <button
          type="button"
          aria-label="Increase quantity"
          className="flex h-full w-10 items-center justify-center text-text-muted transition hover:bg-surface-subtle"
          onClick={() => setQuantity((c) => Math.min(99, c + 1))}
        >
          <Plus className="size-3.5" />
        </button>
      </div>
    </div>
  );
}

function CustomizationPurchaseSection({
  template,
  values,
  dynamicFonts,
  message,
  quantity,
  setQuantity,
  onMessageChange,
  onUploadImage,
  onValueChange,
}: {
  template: CustomizationTemplate;
  values: CustomizationFormValues;
  dynamicFonts: DynamicFontFamily[];
  message: string;
  quantity: number;
  setQuantity: Dispatch<SetStateAction<number>>;
  onMessageChange: (message: string) => void;
  onUploadImage: (field: CustomizationFormField, file: File) => Promise<ImageShapeFieldValue>;
  onValueChange: (fieldId: string, value: CustomizationFormValues[string]) => void;
}) {
  return (
    <div>
      <ProductCustomizationForm
        template={template}
        values={values}
        dynamicFonts={dynamicFonts}
        message={message}
        onMessageChange={onMessageChange}
        onUploadImage={onUploadImage}
        onValueChange={onValueChange}
      />
      <div className="mt-4 border-t border-border-subtle pt-4">
        {/*<QuantityOnlySection quantity={quantity} setQuantity={setQuantity} />*/}
        <QuantityInput value={quantity} onValueChange={setQuantity} />
      </div>
    </div>
  );
}
