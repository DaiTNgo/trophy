import type {
  CustomizationFormField,
  CustomizationFormValues,
  ImageShapeFieldValue,
  ProductCustomization,
} from "@trophy/customization";
import { validateCustomizationValues } from "@trophy/customization";
import { useEffect, useMemo, useRef, useState } from "react";
import { useCart } from "./use-cart";
import { formatCurrency } from "../lib/utils";
import { getLocalized } from "../lib/translation";
import {
  buildProductMediaCarousel,
  buildProductCustomizationTemplate,
  mergeCustomizationValues,
} from "../lib/product-customization";
import {
  uploadStorefrontCustomizationAsset,
  type StorefrontDetailResponse,
} from "../lib/api";
import { recordRecentlyViewedProduct } from "../lib/recently-viewed";
import { resolveCartLineRevision } from "../lib/cart-revision";

type ProductDetail = StorefrontDetailResponse["item"];

function getUploadToken() {
  const storageKey = "trophy-customization-upload-token";
  const existing = window.sessionStorage.getItem(storageKey);
  if (existing) return existing;
  const token = crypto.randomUUID();
  window.sessionStorage.setItem(storageKey, token);
  return token;
}

export function useProductDetailState({
  product,
  dynamicFonts,
  locale,
  activeCategory,
  cartLineRevisionId,
}: {
  product: ProductDetail;
  dynamicFonts: unknown[];
  locale: "vi" | "en";
  activeCategory: ProductDetail["categories"][number] | null;
  cartLineRevisionId: string | null;
}) {
  const { addLine, isReady: isCartReady, lines } = useCart();
  const previewSectionRef = useRef<HTMLDivElement | null>(null);
  const mobilePreviewSentinelRef = useRef<HTMLDivElement | null>(null);
  const mobilePreviewShellRef = useRef<HTMLDivElement | null>(null);
  const recordedRecentlyViewedProductId = useRef<number | null>(null);
  const appliedCartLineRevisionId = useRef<string | null>(null);
  const defaultVariantId =
    product.variants.find(
      (variant) => variant.isDefault && variant.priceAmount !== null,
    )?.id ??
    product.variants.find((variant) => variant.priceAmount !== null)?.id ??
    product.variants.find((variant) => variant.isDefault)?.id ??
    product.variants[0]?.id ??
    null;
  const [selectedVariantId, setSelectedVariantId] = useState<number | null>(
    defaultVariantId,
  );
  const [message, setMessage] = useState("");
  const [cartMessage, setCartMessage] = useState("");
  const [uploadingFieldId, setUploadingFieldId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [selectedMediaId, setSelectedMediaId] = useState<string | null>(null);
  const [isAtPageTop, setIsAtPageTop] = useState(true);
  const [isMobilePreviewHidden, setIsMobilePreviewHidden] = useState(false);
  const [isMobilePreviewAutoRestoreArmed, setIsMobilePreviewAutoRestoreArmed] =
    useState(false);
  const [mobileHiddenShellHeight, setMobileHiddenShellHeight] = useState<
    number | null
  >(null);
  const [isMobilePreviewSticky, setIsMobilePreviewSticky] = useState(false);
  const [isCartLineRevision, setIsCartLineRevision] = useState(false);
  const [revisionNotice, setRevisionNotice] = useState("");
  const [hasInvalidRevisionVariant, setHasInvalidRevisionVariant] =
    useState(false);

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
  const selectedVariantGalleryMedia = useMemo(
    () =>
      [...(selectedVariant?.media ?? [])]
        .filter((media) => Boolean(media.contentUrl))
        .sort((a, b) => a.position - b.position),
    [selectedVariant],
  );
  const selectedVariantMedia = useMemo(
    () =>
      buildProductMediaCarousel({
        customizationMedia: selectedVariant?.customizationMedia,
        galleryMedia: selectedVariantGalleryMedia,
      }),
    [selectedVariant?.customizationMedia, selectedVariantGalleryMedia],
  );
  const selectedMedia =
    selectedVariantMedia.find((media) => media.id === selectedMediaId) ??
    selectedVariantMedia[0] ??
    null;
  const displayPrice = formatCurrency(selectedVariant?.priceAmount ?? null);

  useEffect(() => {
    setSelectedMediaId(selectedVariantMedia[0]?.id ?? null);
  }, [selectedVariant?.id, selectedVariantMedia]);

  const moveSelectedMedia = (direction: -1 | 1) => {
    if (selectedVariantMedia.length < 2) return;
    const currentIndex = selectedVariantMedia.findIndex(
      (media) => media.id === selectedMedia?.id,
    );
    const index = currentIndex < 0 ? 0 : currentIndex;
    const nextIndex =
      (index + direction + selectedVariantMedia.length) %
      selectedVariantMedia.length;
    setSelectedMediaId(selectedVariantMedia[nextIndex]?.id ?? null);
  };

  const resetToCustomizationMedia = () => {
    const customizationMedia = selectedVariant?.customizationMedia;
    setSelectedMediaId(
      customizationMedia?.id ?? selectedVariantMedia[0]?.id ?? null,
    );
  };

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
    if (typeof window === "undefined" || !product.customization?.enabled)
      return;

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
        product.variants.find((variant) => variant.priceAmount !== null)
          ?.priceAmount ??
        product.variants[0]?.priceAmount ??
        null,
    });
    recordedRecentlyViewedProductId.current = product.id;
  }, [
    activeCategory?.handle,
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
      formFields: product.customization
        .formFields as ProductCustomization["formFields"],
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
          })
        : null,
    [
      customization,
      product.id,
      product.title,
      locale,
      selectedCustomizationVariant,
      selectedMedia,
    ],
  );

  const [customizationValues, setCustomizationValues] = useState(() =>
    customizationTemplate
      ? mergeCustomizationValues(customizationTemplate, null)
      : {},
  );

  useEffect(() => {
    if (!customizationTemplate) return;
    setCustomizationValues((current) =>
      mergeCustomizationValues(customizationTemplate, current),
    );
  }, [customizationTemplate]);

  useEffect(() => {
    if (
      !isCartReady ||
      appliedCartLineRevisionId.current === cartLineRevisionId
    ) {
      return;
    }

    appliedCartLineRevisionId.current = cartLineRevisionId;
    setRevisionNotice("");
    setHasInvalidRevisionVariant(false);
    setIsCartLineRevision(false);
    if (!cartLineRevisionId) {
      return;
    }

    const revision = resolveCartLineRevision({
      lines,
      cartLineId: cartLineRevisionId,
      productId: product.id,
      variantIds: product.variants.map((variant) => variant.id),
    });
    if (!revision.line) {
      setRevisionNotice(
        "Your saved customization could not be restored. Please customize this product again.",
      );
      return;
    }

    if (revision.status === "restored") {
      setSelectedVariantId(revision.line.variantId);
    } else {
      setHasInvalidRevisionVariant(true);
      setRevisionNotice(
        "The saved variant is no longer available. Choose a current variant before adding to cart.",
      );
    }

    if (customizationTemplate && revision.line.customizationValues) {
      setCustomizationValues(
        mergeCustomizationValues(
          customizationTemplate,
          revision.line.customizationValues as CustomizationFormValues,
        ),
      );
    }
    setQuantity(1);
    setIsCartLineRevision(true);
  }, [
    cartLineRevisionId,
    customizationTemplate,
    isCartReady,
    lines,
    product.id,
    product.variants,
  ]);

  const customizationValidation = useMemo(
    () =>
      customizationTemplate
        ? validateCustomizationValues({
            template: customizationTemplate,
            values: customizationValues,
          })
        : null,
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
    selectedVariant?.optionValues.map((optionValue) => [
      optionValue.optionId,
      optionValue.id,
    ]) ?? [],
  );
  const visibleOptions = product.options
    .map((option) => ({
      ...option,
      values: [...option.values].sort((a, b) => a.position - b.position),
    }))
    .sort((a, b) => a.position - b.position)
    .filter((option) => option.values.length > 1);

  function variantMatchesSelection(
    variant: ProductDetail["variants"][number],
    selectedValues: Map<number, number>,
  ) {
    return Array.from(selectedValues.entries()).every(([optionId, valueId]) =>
      variant.optionValues.some(
        (optionValue) =>
          optionValue.optionId === optionId && optionValue.id === valueId,
      ),
    );
  }

  function findVariantForOptionValue(optionId: number, valueId: number) {
    const nextSelection = new Map(selectedOptionValueIds);
    nextSelection.set(optionId, valueId);
    return (
      product.variants.find((variant) =>
        variantMatchesSelection(variant, nextSelection),
      ) ??
      product.variants.find((variant) =>
        variant.optionValues.some(
          (optionValue) =>
            optionValue.optionId === optionId && optionValue.id === valueId,
        ),
      ) ??
      null
    );
  }

  const mainMedia = selectedMedia;
  const galleryThumbnails = selectedVariantMedia.map((media, index) => ({
    id: media.id,
    src: media.contentUrl,
    alt: `${getLocalized(product.title, locale)} - image ${index + 1}`,
    active: media.id === selectedMedia?.id,
    onClick: () => setSelectedMediaId(media.id),
  }));
  const contactHref = `/contact?product=${encodeURIComponent(getLocalized(product.title, locale))}${
    selectedVariant
      ? `&variant=${encodeURIComponent(getLocalized(selectedVariant.title, locale))}`
      : ""
  }${selectedVariant?.sku ? `&sku=${encodeURIComponent(selectedVariant.sku)}` : ""}`;

  const addToCartDisabled =
    !selectedVariant ||
    selectedVariant.priceAmount === null ||
    quantity < 1 ||
    Boolean(uploadingFieldId) ||
    hasInvalidRevisionVariant ||
    Boolean(
      customizationTemplate &&
      customizationValidation &&
      !customizationValidation.valid,
    );

  const addToCartMessage = selectedVariant
    ? selectedVariant.priceAmount === null
      ? "This variant uses Contact Price and cannot be added to cart."
      : hasInvalidRevisionVariant
        ? "Choose a current variant before adding this item to cart."
        : customizationTemplate &&
            customizationValidation &&
            !customizationValidation.valid
          ? "Complete the required customization fields before adding this item to cart."
          : cartMessage
    : "Select a variant before adding this item to cart.";

  function handleAddToCart() {
    if (
      !selectedVariant ||
      selectedVariant.priceAmount === null ||
      quantity < 1
    ) {
      return;
    }

    if (
      customizationTemplate &&
      customizationValidation &&
      !customizationValidation.valid
    ) {
      setCartMessage(
        "Complete the required customization fields before adding this item to cart.",
      );
      return;
    }

    const customizationSummary = customizationTemplate
      ? customizationTemplate.formFields
          .map((field) => {
            const value = customizationValues[field.id];
            if (!value) {
              return null;
            }

            if (
              typeof value === "object" &&
              value &&
              "text" in value &&
              typeof value.text === "string"
            ) {
              return {
                fieldId: field.id,
                label: field.label,
                valueSummary: value.text,
              };
            }

            if (typeof value === "object" && value && "assetId" in value) {
              return {
                fieldId: field.id,
                label: field.label,
                valueSummary: "Uploaded image",
              };
            }

            if (
              typeof value === "object" &&
              value &&
              "source" in value &&
              value.source === "clipart"
            ) {
              return {
                fieldId: field.id,
                label: field.label,
                valueSummary: value.clipartAssetName,
              };
            }

            return {
              fieldId: field.id,
              label: field.label,
              valueSummary: "Custom value",
            };
          })
          .filter(
            (
              entry,
            ): entry is {
              fieldId: string;
              label: string;
              valueSummary: string;
            } => entry !== null,
          )
      : [];

    addLine(
      {
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
          thumbnail:
            selectedVariant.media[0]?.contentUrl ??
            product.media[0]?.url ??
            null,
          priceAmount: selectedVariant.priceAmount,
          customizable: Boolean(customizationTemplate),
          requiresCustomization: Boolean(customizationTemplate),
          isContactPrice: selectedVariant.priceAmount === null,
        },
      },
      { forceSeparate: isCartLineRevision },
    );
    setCartMessage("Added to cart. You can keep browsing or open the cart.");
  }

  async function uploadCustomizationImage(
    field: CustomizationFormField,
    file: File,
  ): Promise<ImageShapeFieldValue> {
    setUploadingFieldId(field.id);
    try {
      const asset = await uploadStorefrontCustomizationAsset(
        file,
        getUploadToken(),
      );

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

  const onOptionSelect = (optionId: number, valueId: number) => {
    const nextVariant = findVariantForOptionValue(optionId, valueId);
    if (nextVariant) {
      setSelectedVariantId(nextVariant.id);
      setHasInvalidRevisionVariant(false);
    }
  };

  const isOptionValueAvailable = (optionId: number, valueId: number) =>
    Boolean(findVariantForOptionValue(optionId, valueId));

  return {
    activeCategory,
    addToCartDisabled,
    addToCartMessage,
    contactHref,
    customizationTemplate,
    customizationValues,
    dynamicFonts,
    displayPrice,
    galleryThumbnails,
    handleAddToCart,
    hasInvalidRevisionVariant,
    isAtPageTop,
    isOptionValueAvailable,
    isCustomizationEnabled: Boolean(customizationTemplate),
    isMobilePreviewAutoRestoreArmed,
    isMobilePreviewHidden,
    isMobilePreviewSticky,
    locale,
    mainMedia: selectedMedia,
    message,
    mobileGalleryThumbnails: galleryThumbnails,
    mobileHiddenShellHeight,
    mobilePreviewSentinelRef,
    mobilePreviewShellRef,
    moveSelectedMedia,
    onOptionSelect,
    previewSectionRef,
    product,
    quantity,
    resetToCustomizationMedia,
    revisionNotice,
    selectedMedia,
    selectedVariant,
    selectedVariantMedia,
    selectedOptionValueIds,
    setCustomizationValues,
    setIsMobilePreviewAutoRestoreArmed,
    setIsMobilePreviewHidden,
    setMessage,
    setMobileHiddenShellHeight,
    setQuantity,
    shortDescription,
    specs,
    uploadCustomizationImage,
    visibleOptions,
  };
}
