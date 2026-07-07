import { startTransition, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";

import { useCatalog } from "../../hooks/use-catalog";
import { useBrandAssets } from "../../hooks/use-brand-assets";
import { useEmbeddedProductCustomizationEditor } from "../../hooks/use-embedded-product-customization-editor";
import {
  createEmptyEmbeddedCustomizationDraft,
  getCustomizationTabRequirement,
  getPreviewBackgrounds,
  getSubmittedCustomization,
  resolveSelectedPreviewBackground,
  type EmbeddedCustomizationDraft,
} from "../create-product-helpers";
import { fetchProductMetadata, type ProductMetadataSnapshot } from "../../lib/product-metadata-client";
import { convertPdfToImageFile } from "../../lib/pdf-preview";
import { uploadProductVariantMedia } from "../../lib/product-assets-client";
import { createFullProduct, mapApiProductToCatalogProduct } from "../../lib/products-client";
import {
  createEmptyOptionDefinition,
  createOptionValueDefinition,
  getEffectiveOptionDefinitions,
  isPublishReady,
  reconcileVariantRows,
  validateCreateProduct,
} from "../../lib/product-utils";
import { slugify } from "../../lib/utils";
import type {
  CreateProductErrors,
  CreateProductFormValues,
  ProductAttribute,
  ProductOptionDefinition,
  ProductVariant,
  ProductVariantMedia,
  AdminLocale,
  LocalizedTextValue,
} from "../../types";

export type CreateProductStep = "details" | "organize" | "variants" | "customization";

export const defaultCreateProductValues: CreateProductFormValues = {
  title: { vi: "", en: "" },
  handle: "",
  subtitle: { vi: "", en: "" },
  description: { vi: "", en: "" },
  customizationEnabled: false,
  collection: "",
  categories: [],
  media: "",
  hasVariants: false,
  basePrice: "",
  inventory: "",
  optionNameOne: "",
  optionValuesOne: "",
  optionNameTwo: "",
  optionValuesTwo: "",
};

export function buildVariantSignature(options: { option: string; value: string }[]) {
  if (options.length === 0) {
    return "__default__";
  }
  return options
    .map((option) => `${option.option}:${option.value}`)
    .join("|");
}

export function useCreateProduct() {
  const { products, createProduct } = useCatalog();
  const { fonts } = useBrandAssets();
  const navigate = useNavigate();

  const [metadata, setMetadata] = useState<ProductMetadataSnapshot>({
    collections: [],
    categories: [],
  });
  const [metadataError, setMetadataError] = useState<string | null>(null);
  const [isLoadingMetadata, setIsLoadingMetadata] = useState(true);
  const [values, setValues] = useState<CreateProductFormValues>(
    defaultCreateProductValues,
  );
  const [selectedCollectionId, setSelectedCollectionId] = useState<string>("");
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [selectedPreviewAssetId, setSelectedPreviewAssetId] = useState<string | null>(null);
  const [embeddedCustomization, setEmbeddedCustomization] = useState<EmbeddedCustomizationDraft>(
    () => createEmptyEmbeddedCustomizationDraft(),
  );
  const [attributes, setAttributes] = useState<ProductAttribute[]>([
    { key: { vi: "", en: "" }, value: { vi: "", en: "" } },
  ]);
  const [errors, setErrors] = useState<CreateProductErrors>({});
  const [optionDefinitions, setOptionDefinitions] = useState<
    ProductOptionDefinition[]
  >([]);
  const [optionValueDrafts, setOptionValueDrafts] = useState<
    Record<string, string>
  >({});
  const [activeStep, setActiveStep] = useState<CreateProductStep>("details");
  const [variantRows, setVariantRows] = useState<ProductVariant[]>(() =>
    reconcileVariantRows([], defaultCreateProductValues, []),
  );
  const [variantMediaError, setVariantMediaError] = useState<string | null>(
    null,
  );
  const [customizationTabError, setCustomizationTabError] = useState<string | null>(
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

  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const [showColumns, setShowColumns] = useState({
    sku: true,
    media: true,
    backorder: true,
    price: true,
    inventory: true,
  });

  const stepOrder: readonly CreateProductStep[] = values.customizationEnabled
    ? ["details", "organize", "variants", "customization"]
    : ["details", "organize", "variants"];
  const activeStepIndex = stepOrder.indexOf(activeStep);
  const isLastStep = activeStep === stepOrder[stepOrder.length - 1];

  const effectiveVariantRows = useMemo(
    () => reconcileVariantRows(variantRows, values, optionDefinitions),
    [optionDefinitions, values, variantRows],
  );

  const publishReady = isPublishReady(
    values,
    effectiveVariantRows,
    optionDefinitions,
  );

  const createdVariantRows = useMemo(
    () => effectiveVariantRows.filter((variant) => variant.shouldCreate),
    [effectiveVariantRows]
  );

  const previewBackgrounds = useMemo(
    () => getPreviewBackgrounds(createdVariantRows),
    [createdVariantRows]
  );

  const selectedPreviewBackground = useMemo(
    () => resolveSelectedPreviewBackground({
      backgrounds: previewBackgrounds,
      selectedAssetId: selectedPreviewAssetId,
    }),
    [previewBackgrounds, selectedPreviewAssetId]
  );

  const dynamicFonts = fonts.map((font) => ({
    id: font.id,
    name: font.name,
    regularAssetId: (font as any).regularAssetId || null,
    boldAssetId: (font as any).boldAssetId || null,
    italicAssetId: (font as any).italicAssetId || null,
    boldItalicAssetId: (font as any).boldItalicAssetId || null,
  }));

  const customizationTabRequirement = getCustomizationTabRequirement({
    customizationEnabled: values.customizationEnabled,
    createdVariantRows,
  });

  const embeddedEditor = useEmbeddedProductCustomizationEditor({
    productTitle: values.title.vi,
    productId: values.handle.trim() || slugify(values.title.vi || "new-product"),
    background: selectedPreviewBackground,
    draft: embeddedCustomization,
    onDraftChange: setEmbeddedCustomization,
  });

  useEffect(() => {
    let active = true;

    async function loadMetadata() {
      setIsLoadingMetadata(true);
      setMetadataError(null);

      try {
        const nextMetadata = await fetchProductMetadata();
        if (!active) {
          return;
        }
        setMetadata(nextMetadata);
      } catch (error) {
        if (!active) {
          return;
        }
        setMetadataError(
          error instanceof Error ? error.message : "Unable to load product metadata.",
        );
      } finally {
        if (active) {
          setIsLoadingMetadata(false);
        }
      }
    }

    void loadMetadata();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (previewBackgrounds.length === 0) {
      if (selectedPreviewAssetId !== null) {
        setSelectedPreviewAssetId(null);
      }
      return;
    }

    if (!selectedPreviewAssetId || !previewBackgrounds.some((asset) => asset.assetId === selectedPreviewAssetId)) {
      setSelectedPreviewAssetId(previewBackgrounds[0].assetId);
    }
  }, [previewBackgrounds, selectedPreviewAssetId]);

  useEffect(() => {
    setVariantRows((current) =>
      reconcileVariantRows(current, values, optionDefinitions),
    );
  }, [optionDefinitions, values.hasVariants, values.inventory]);

  useEffect(() => {
    if (!values.customizationEnabled && activeStep === "customization") {
      setActiveStep("variants");
    }
  }, [activeStep, values.customizationEnabled]);

  useEffect(() => {
    if (customizationTabRequirement.ready) {
      setCustomizationTabError(null);
    }
  }, [customizationTabRequirement.ready]);

  useEffect(() => {
    if (!values.customizationEnabled || !customizationTabRequirement.ready) {
      return;
    }

    const firstMedia = createdVariantRows[0]?.media[0];
    if (!firstMedia) {
      return;
    }

    setEmbeddedCustomization((current) => {
      if (
        current.canvasWidthPx === firstMedia.widthPx &&
        current.canvasHeightPx === firstMedia.heightPx
      ) {
        return current;
      }

      return {
        ...current,
        canvasWidthPx: current.canvasWidthPx ?? firstMedia.widthPx,
        canvasHeightPx: current.canvasHeightPx ?? firstMedia.heightPx,
      };
    });
  }, [createdVariantRows, customizationTabRequirement.ready, values.customizationEnabled]);

  const pendingBlobUrls = useRef(new Set<string>());

  useEffect(() => {
    const urls = new Set<string>();
    variantRows.forEach((variant) => {
      variant.media.forEach((asset) => {
        if (asset.isPending) urls.add(asset.contentUrl);
      });
    });
    pendingBlobUrls.current = urls;
  });

  useEffect(() => {
    return () => {
      pendingBlobUrls.current.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  function setValue<K extends keyof CreateProductFormValues>(
    key: K,
    nextValue: CreateProductFormValues[K],
  ) {
    setValues((current) => ({ ...current, [key]: nextValue }));
  }

  function updateAttribute(
    index: number,
    key: keyof ProductAttribute,
    nextValue: LocalizedTextValue,
  ) {
    setAttributes((current) =>
      current.map((attribute, currentIndex) =>
        currentIndex === index ? { ...attribute, [key]: nextValue } : attribute,
      ),
    );
  }

  function addAttributeRow() {
    setAttributes((current) => [...current, { key: { vi: "", en: "" }, value: { vi: "", en: "" } }]);
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
    step: CreateProductStep,
    nextErrors: CreateProductErrors,
  ) {
    const stepKeys: Record<typeof step, string[]> = {
      details: ["title", "handle", "attributes", "optionDefinitions", "form"],
      organize: ["form"],
      variants: ["variants", "publish", "form"],
      customization: ["publish", "form"],
    };

    return Object.fromEntries(
      Object.entries(nextErrors).filter(([key]) =>
        stepKeys[step].includes(key),
      ),
    ) as CreateProductErrors;
  }

  function goToStep(step: CreateProductStep) {
    if (step === "customization" && !customizationTabRequirement.ready) {
      setCustomizationTabError(customizationTabRequirement.message);
      setActiveStep("variants");
      return;
    }

    setCustomizationTabError(null);
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

    if (nextStep === "customization" && !customizationTabRequirement.ready) {
      setCustomizationTabError(customizationTabRequirement.message);
      setActiveStep("variants");
      return;
    }

    setCustomizationTabError(null);
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
      const enabledOptionDefinitions = getEffectiveOptionDefinitions(
        values,
        optionDefinitions,
      )
        .map((option) => ({
          title: option.titleTranslations ?? { vi: option.title.trim(), en: "" },
          values: option.values.filter(v => v.value.trim() !== "").map((value) => ({
            value: value.valueTranslations ?? { vi: value.value.trim(), en: "" }
          })),
        }))
        .filter((option) => option.title.vi.trim() !== "" && option.values.length > 0);
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

              const uploaded = await uploadProductVariantMedia(media.file, media.widthPx, media.heightPx);
              return uploaded;
            }),
          );

          return {
            ...variant,
            media: uploadedMedia,
          };
        }),
      );

      const submittedVariants = variantRowsWithUploadedMedia
        .filter((variant) => variant.shouldCreate)
        .map((variant, index) => ({
          title: variant.title,
          sku: variant.sku.trim() || null,
          priceAmount: Number.isFinite(variant.price) && variant.price > 0 ? variant.price : null,
          inventoryQuantity: Number.isFinite(variant.inventory) ? variant.inventory : 0,
          allowBackorder: variant.allowBackorder,
          isDefault: index === 0,
          optionValues: variant.options.map((option) => ({
            optionTitle: option.option,
            value: option.value,
          })),
          media: variant.media.map((asset) => ({ assetId: asset.id })),
        }));

      const createdProduct = await createFullProduct({
        mode,
        details: {
          title: values.title,
          subtitle: values.subtitle.vi.trim() !== "" ? values.subtitle : null,
          handle: values.handle.trim() || null,
          description: values.description.vi.trim() !== "" ? values.description : null,
        },
        organization: {
          collectionId: selectedCollectionId ? Number(selectedCollectionId) : null,
          categoryIds: selectedCategoryIds.map((id) => Number(id)),
        },
        attributes: attributes
          .filter((attribute) => attribute.key.vi.trim() !== "" && attribute.value.vi.trim() !== "")
          .map((attribute) => ({
            name: attribute.key,
            value: attribute.value,
            unit: null,
          })),
        options: enabledOptionDefinitions,
        variants: submittedVariants,
        customization: getSubmittedCustomization({
          customizationEnabled: values.customizationEnabled,
          draft: embeddedCustomization,
        }),
      });

      const nextProduct = createProduct(mapApiProductToCatalogProduct(createdProduct));

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
        option.id === optionId
          ? {
              ...option,
              title,
              titleTranslations: {
                vi: title,
                en: option.titleTranslations?.en ?? "",
              },
            }
          : option,
      ),
    );
  }

  function updateOptionTitleTranslation(optionId: string, locale: AdminLocale, nextValue: string) {
    setOptionDefinitions((current) =>
      current.map((option) => {
        if (option.id !== optionId) {
          return option;
        }

        const nextTranslations: LocalizedTextValue = {
          vi: option.titleTranslations?.vi ?? option.title,
          en: option.titleTranslations?.en ?? "",
          [locale]: nextValue,
        };

        return {
          ...option,
          title: nextTranslations.vi,
          titleTranslations: nextTranslations,
        };
      }),
    );
  }

  function setOptionDraftValue(optionId: string, draft: string) {
    setOptionValueDrafts((current) => ({ ...current, [optionId]: draft }));
  }

  function appendOptionValue(optionId: string, locale: AdminLocale = "vi") {
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
          option.values.map((value) => {
            const translations = value.valueTranslations ?? { vi: value.value, en: "" };
            return (translations[locale] || value.value).toLowerCase();
          }),
        );
        const appended = nextValues
          .filter((value) => !existing.has(value.toLowerCase()))
          .map((value) => {
            const nextValue = createOptionValueDefinition(locale === "vi" ? value : "");
            return {
              ...nextValue,
              value: locale === "vi" ? value : "",
              valueTranslations: {
                vi: locale === "vi" ? value : "",
                en: locale === "en" ? value : "",
              },
            };
          });
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

  function updateOptionValueTranslation(
    optionId: string,
    valueId: string,
    translations: LocalizedTextValue,
  ) {
    setOptionDefinitions((current) =>
      current.map((option) =>
        option.id === optionId
          ? {
              ...option,
              values: option.values.map((value) =>
                value.id === valueId
                  ? {
                      ...value,
                      value: translations.vi,
                      valueTranslations: translations,
                    }
                  : value,
              ),
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
          if (!["image/png", "image/jpeg", "image/webp", "application/pdf"].includes(file.type)) {
            throw new Error("Only PNG, JPEG, WebP, and PDF product assets are supported.");
          }

          let fileToProcess = file;
          if (file.type === "application/pdf") {
            fileToProcess = await convertPdfToImageFile(file);
          }

          let dimensions: { width: number; height: number };
          const objectUrl = URL.createObjectURL(fileToProcess);
          dimensions = await new Promise<{
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
              reject(new Error("Unable to read image dimensions."));
            };
            image.src = objectUrl;
          });

          return {
            id: `pending_${crypto.randomUUID()}`,
            fileName: fileToProcess.name,
            mimeType: fileToProcess.type,
            widthPx: dimensions.width,
            heightPx: dimensions.height,
            byteSize: fileToProcess.size,
            contentUrl: objectUrl,
            file: fileToProcess,
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

  return {
    // State
    metadata,
    metadataError,
    isLoadingMetadata,
    values,
    selectedCollectionId,
    selectedCategoryIds,
    selectedPreviewAssetId,
    embeddedCustomization,
    attributes,
    errors,
    optionDefinitions,
    optionValueDrafts,
    activeStep,
    variantRows,
    variantMediaError,
    customizationTabError,
    processingVariantKeys,
    isSubmittingMedia,
    variantGallery,
    fileInputRefs,
    showColumns,
    
    // Computed
    stepOrder,
    activeStepIndex,
    isLastStep,
    effectiveVariantRows,
    publishReady,
    createdVariantRows,
    previewBackgrounds,
    selectedPreviewBackground,
    dynamicFonts,
    customizationTabRequirement,
    embeddedEditor,
    
    // Actions
    setValues,
    setValue,
    setSelectedCollectionId,
    setSelectedCategoryIds,
    setSelectedPreviewAssetId,
    setEmbeddedCustomization,
    setAttributes,
    updateAttribute,
    addAttributeRow,
    removeAttributeRow,
    setErrors,
    clearErrors,
    setOptionDefinitions,
    addOptionDefinition,
    removeOptionDefinition,
    updateOptionDefinition,
    updateOptionTitleTranslation,
    setOptionValueDrafts,
    setOptionDraftValue,
    appendOptionValue,
    removeOptionValue,
    updateOptionValueTranslation,
    setActiveStep,
    goToStep,
    continueToNextStep,
    submit,
    setVariantRows,
    updateVariantRow,
    toggleVariantCreation,
    toggleAllVariants,
    updateVariantMedia,
    handleVariantMediaUpload,
    handleDeleteVariantMedia,
    setVariantMediaError,
    setProcessingVariantKeys,
    setIsSubmittingMedia,
    setVariantGallery,
    openVariantGallery,
    closeVariantGallery,
    showPreviousGalleryAsset,
    showNextGalleryAsset,
    setShowColumns,
  };
}
