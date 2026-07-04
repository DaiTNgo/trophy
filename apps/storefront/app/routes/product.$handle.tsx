import type { DynamicFontFamily, ProductCustomization } from "@trophy/customization";
import { useEffect, useMemo, useState } from "react";
import { useLoaderData } from "react-router";
import { ProductBreadcrumbs } from "../components/product/ProductBreadcrumbs";
import {
  ProductCustomizationForm,
  ProductCustomizationPreview,
} from "../components/product/ProductCustomization";
import { ProductGallery } from "../components/product/ProductGallery";
import { ProductInfo } from "../components/product/ProductInfo";
import { ProductMobileActionBar } from "../components/product/ProductMobileActionBar";
import {
  buildProductCustomizationTemplate,
  mergeCustomizationValues,
} from "../lib/product-customization";
import {
  fetchStorefrontDynamicFonts,
  fetchStorefrontProduct,
  type StorefrontDetailResponse,
} from "../lib/api";
import type { Route } from "./+types/product.$handle";

export async function loader({ params }: Route.LoaderArgs) {
  const product = await fetchStorefrontProduct(params.handle);
  const dynamicFonts = product.customization
    ? await fetchStorefrontDynamicFonts()
    : [];

  return { product, dynamicFonts };
}

export function meta({ loaderData }: Route.MetaArgs) {
  const title = loaderData?.product?.title || "Sản Phẩm";
  return [{ title: `${title} | TROPHY PRESTIGE` }];
}

function formatPrice(cents: number | null): string {
  if (cents === null) {
    return "Liên Hệ";
  }
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(cents);
}

export default function ProductDetail() {
  const { product, dynamicFonts } = useLoaderData<typeof loader>();
  const prices = product.variants.map((variant) => variant.priceAmount).filter((price): price is number => price !== null);
  const displayPrice = formatPrice(prices.length > 0 ? Math.min(...prices) : null);
  const defaultVariantId = product.variants.find((variant) => variant.isDefault)?.id ?? product.variants[0]?.id ?? null;
  const [selectedVariantId, setSelectedVariantId] = useState<number | null>(defaultVariantId);
  const [message, setMessage] = useState("");
  const [uploadingFieldId, setUploadingFieldId] = useState("");

  const selectedVariant =
    product.variants.find((variant) => variant.id === selectedVariantId) ??
    product.variants.find((variant) => variant.id === defaultVariantId) ??
    null;

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
            productTitle: product.title,
            customization,
            selectedVariant,
          })
        : null,
    [customization, product.id, product.title, selectedVariant],
  );

  const [customizationValues, setCustomizationValues] = useState(() =>
    customizationTemplate ? mergeCustomizationValues(customizationTemplate, null) : {},
  );

  useEffect(() => {
    if (!customizationTemplate) return;
    setCustomizationValues((current) => mergeCustomizationValues(customizationTemplate, current));
  }, [customizationTemplate]);

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

  const variantButtons = product.variants.map((variant) => {
    const optionSummary = variant.optionValues
      .map((optionValue) => optionValue.optionTitle ? `${optionValue.optionTitle}: ${optionValue.value}` : optionValue.value)
      .join(" / ");

    return (
      <button
        key={variant.id}
        type="button"
        data-variant-id={variant.id}
        data-selected={variant.id === selectedVariant?.id}
        onClick={() => setSelectedVariantId(variant.id)}
        className={`rounded-lg border px-4 py-3 text-left transition ${
          variant.id === selectedVariant?.id
            ? "border-primary bg-primary text-white"
            : "border-outline hover:border-primary"
        }`}
      >
        <div className="font-label-md uppercase">{variant.title}</div>
        {optionSummary ? <div className="mt-1 text-xs opacity-80">{optionSummary}</div> : null}
      </button>
    );
  });

  const mainMedia = selectedVariant?.media[0] ?? null;
  const galleryThumbnails = product.variants
    .filter((variant) => variant.media[0]?.contentUrl)
    .map((variant) => ({
      id: String(variant.id),
      src: variant.media[0]!.contentUrl,
      alt: `${product.title} - ${variant.title}`,
      active: variant.id === selectedVariant?.id,
      onClick: () => setSelectedVariantId(variant.id),
    }));

  return (
    <div className="bg-background text-on-surface font-body-md selection:bg-primary-fixed selection:text-on-primary-fixed">
      <main className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-12 md:py-20">
        <ProductBreadcrumbs title={product.title} />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
          <ProductGallery
            mainContent={
              customizationTemplate ? (
                <div
                  className="aspect-[4/5] flex items-center justify-center p-4"
                  data-selected-variant-id={selectedVariant?.id ?? ""}
                >
                  <ProductCustomizationPreview
                    template={customizationTemplate}
                    values={customizationValues}
                    dynamicFonts={dynamicFonts as DynamicFontFamily[]}
                    selectedVariantId={selectedVariant?.id ?? null}
                  />
                </div>
              ) : mainMedia?.contentUrl ? (
                <div className="aspect-[4/5] group">
                  <img
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    src={mainMedia.contentUrl}
                    alt={product.title}
                  />
                </div>
              ) : (
                <div className="aspect-[4/5] flex items-center justify-center text-on-surface-variant">
                  Product image unavailable
                </div>
              )
            }
            thumbnails={galleryThumbnails}
          />
          <ProductInfo
            title={product.title}
            price={displayPrice}
            rating={5}
            reviewsCount={0}
            description={product.description || ""}
            specs={specs}
            variantSelector={
              product.variants.length > 0 ? (
                <div className="space-y-4">
                  <label className="font-label-md text-on-surface uppercase">Variant</label>
                  <div className="grid gap-3 sm:grid-cols-2">{variantButtons}</div>
                </div>
              ) : null
            }
            customizationSection={
              customizationTemplate ? (
                <div className="space-y-4 p-6 bg-surface-container-low rounded-lg">
                  <h3 className="font-headline-md text-[20px] uppercase text-on-surface tracking-wide flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary">edit_note</span>
                    Customization
                  </h3>
                  <p className="text-sm text-on-surface-variant">
                    Preview uses the first image from the currently selected variant. There is no separate background picker.
                  </p>
                  <ProductCustomizationForm
                    template={customizationTemplate}
                    values={customizationValues}
                    dynamicFonts={dynamicFonts as DynamicFontFamily[]}
                    message={message}
                    uploadingFieldId={uploadingFieldId}
                    onUploadingFieldIdChange={setUploadingFieldId}
                    onMessageChange={setMessage}
                    onValueChange={(fieldId, value) => {
                      setCustomizationValues((current) => ({ ...current, [fieldId]: value }));
                    }}
                  />
                </div>
              ) : null
            }
          />
        </div>
        <ProductMobileActionBar price={displayPrice} />
      </main>
    </div>
  );
}

export type StorefrontProductDetail = StorefrontDetailResponse["item"];
