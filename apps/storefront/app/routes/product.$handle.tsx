import type { DynamicFontFamily, ProductCustomization } from "@trophy/customization";
import { useEffect, useMemo, useState } from "react";
import { useLoaderData } from "react-router";
import { PenSquare } from "lucide-react";
import { validateCustomizationValues } from "@trophy/customization";
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
import { useCart } from "../hooks/use-cart";
import { formatCurrency } from "../lib/utils";
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

export default function ProductDetail() {
  const { product, dynamicFonts } = useLoaderData<typeof loader>();
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
  const contactHref = `/contact?product=${encodeURIComponent(product.title)}${
    selectedVariant ? `&variant=${encodeURIComponent(selectedVariant.title)}` : ""
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
        productTitle: product.title,
        productHandle: product.handle,
        variantTitle: selectedVariant.title,
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
                    className="w-full h-full object-contain transition-transform duration-700 group-hover:scale-105"
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
                  <div className="space-y-2">
                    <label className="font-label-md text-on-surface uppercase">Quantity</label>
                    <div className="inline-flex items-center overflow-hidden rounded-lg border border-outline">
                      <button
                        type="button"
                        className="px-4 py-3 text-on-surface transition hover:bg-surface-container"
                        onClick={() => setQuantity((current) => Math.max(1, current - 1))}
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min={1}
                        value={quantity}
                        onChange={(event) => {
                          const nextValue = Number(event.target.value);
                          setQuantity(Number.isFinite(nextValue) && nextValue > 0 ? Math.min(99, nextValue) : 1);
                        }}
                        className="w-16 border-x border-outline bg-white px-3 py-3 text-center"
                      />
                      <button
                        type="button"
                        className="px-4 py-3 text-on-surface transition hover:bg-surface-container"
                        onClick={() => setQuantity((current) => Math.min(99, current + 1))}
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              ) : null
            }
            customizationSection={
              customizationTemplate ? (
                <div className="space-y-4 p-6 bg-surface-container-low rounded-lg">
                  <h3 className="font-headline-md text-[20px] uppercase text-on-surface tracking-wide flex items-center gap-2">
                    <PenSquare className="text-primary" />
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
            isContactPrice={selectedVariant?.priceAmount === null}
            contactHref={contactHref}
            primaryActionLabel="Add to Cart"
            primaryActionDisabled={addToCartDisabled}
            primaryActionMessage={addToCartMessage}
            onPrimaryAction={handleAddToCart}
          />
        </div>
        <ProductMobileActionBar
          price={displayPrice}
          label="Add to Cart"
          disabled={addToCartDisabled}
          onClick={handleAddToCart}
          contactHref={selectedVariant?.priceAmount === null ? contactHref : undefined}
        />
      </main>
    </div>
  );
}

export type StorefrontProductDetail = StorefrontDetailResponse["item"];
