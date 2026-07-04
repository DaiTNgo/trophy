import { useEffect, useMemo, useState, useRef, startTransition } from "react";
import { useNavigate, useParams } from "react-router";
import { useCatalog } from "../../hooks/use-catalog";
import { extractPdfPreview } from "../../lib/pdf-preview";
import { uploadProductVariantMedia } from "../../lib/product-assets-client";
import {
  buildVariantPreview,
  buildUpdatedProduct,
  isPublishReady,
  productToFormValues,
  reconcileVariantRows,
  validateCreateProduct,
} from "../../lib/product-utils";
import type {
  CreateProductFormValues,
  CreateProductErrors,
  CreateProductSubmission,
  ProductAttribute,
  ProductVariant,
  ProductVariantMedia,
  VariantOptionValue,
} from "../../types";

const defaultCreateProductValues: CreateProductFormValues = {
  title: "",
  handle: "",
  subtitle: "",
  description: "",
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

export function useProductDetail() {
  const { productId } = useParams();
  const { products, updateProduct } = useCatalog();
  const navigate = useNavigate();
  const product = products.find((entry) => entry.id === productId);

  const [errors, setErrors] = useState<CreateProductErrors>({});
  const [variantRows, setVariantRows] = useState<ProductVariant[]>(() =>
    product ? product.variants : [],
  );
  const [variantMediaError, setVariantMediaError] = useState<string | null>(null);
  const [processingVariantKeys, setProcessingVariantKeys] = useState<string[]>([]);
  const [isSubmittingMedia, setIsSubmittingMedia] = useState(false);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  
  const [variantGallery, setVariantGallery] = useState<{
    title: string;
    assets: ProductVariantMedia[];
    activeIndex: number;
  } | null>(null);

  const [values, setValues] = useState<CreateProductFormValues>(() =>
    product ? productToFormValues(product) : defaultCreateProductValues,
  );
  const [attributes, setAttributes] = useState<ProductAttribute[]>(() =>
    product && product.attributes.length > 0 ? product.attributes : [{ key: "", value: "" }],
  );

  useEffect(() => {
    if (!product) return;

    setValues(productToFormValues(product));
    setVariantRows(product.variants);
    setAttributes(product.attributes.length > 0 ? product.attributes : [{ key: "", value: "" }]);
  }, [product]);

  useEffect(() => {
    setVariantRows((current) => reconcileVariantRows(current, values));
  }, [
    values.hasVariants,
    values.inventory,
    values.optionNameOne,
    values.optionValuesOne,
    values.optionNameTwo,
    values.optionValuesTwo,
  ]);

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

  const variantPreview = useMemo(() => buildVariantPreview(values), [values]);
  const effectiveVariantRows = useMemo(
    () => reconcileVariantRows(variantRows, values),
    [values, variantRows],
  );
  const publishReady = isPublishReady(values, variantPreview);

  function setValue<K extends keyof CreateProductFormValues>(
    key: K,
    nextValue: CreateProductFormValues[K],
  ) {
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

  function buildVariantSignature(options: VariantOptionValue[]) {
    if (options.length === 0) return "__default__";
    return options.map((option) => `${option.option}:${option.value}`).join("|");
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

  async function handleVariantMediaUpload(variantSignature: string, files: FileList | null) {
    if (!files || files.length === 0) return;

    setVariantMediaError(null);
    setProcessingVariantKeys((current) => [...current, variantSignature]);

    try {
      const stagedAssets = await Promise.all(
        Array.from(files).map(async (file) => {
          if (!["image/png", "image/jpeg", "application/pdf"].includes(file.type)) {
            throw new Error("Only PNG, JPEG, and PDF product assets are supported.");
          }

          let dimensions: { width: number; height: number };
          let objectUrl: string;

          if (file.type === "application/pdf") {
            const preview = await extractPdfPreview(file);
            dimensions = { width: preview.width, height: preview.height };
            objectUrl = preview.dataUrl;
          } else {
            objectUrl = URL.createObjectURL(file);
            dimensions = await new Promise<{
              width: number;
              height: number;
            }>((resolve, reject) => {
              const imgEl = document.createElement("img");
              imgEl.onload = () => {
                resolve({ width: imgEl.naturalWidth, height: imgEl.naturalHeight });
              };
              imgEl.onerror = () => {
                reject(new Error("Image data is invalid or unsupported."));
              };
              imgEl.src = objectUrl;
            });
          }

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
      updateVariantMedia(variantSignature, (currentMedia) => [...currentMedia, ...stagedAssets]);
    } catch (error) {
      setVariantMediaError(
        error instanceof Error ? error.message : "Unable to upload variant media.",
      );
    } finally {
      setProcessingVariantKeys((current) => current.filter((key) => key !== variantSignature));
    }
  }

  function handleDeleteVariantMedia(variantSignature: string, assetId: string) {
    setVariantMediaError(null);
    updateVariantMedia(variantSignature, (currentMedia) => {
      const target = currentMedia.find((asset) => asset.id === assetId);
      if (target?.isPending) {
        URL.revokeObjectURL(target.contentUrl);
      }
      return currentMedia.filter((asset) => asset.id !== assetId);
    });
  }

  function openVariantGallery(title: string, assets: ProductVariantMedia[], activeIndex: number) {
    if (assets.length === 0) return;
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
      if (!current) return current;
      return {
        ...current,
        activeIndex: current.activeIndex === 0 ? current.assets.length - 1 : current.activeIndex - 1,
      };
    });
  }

  function showNextGalleryAsset() {
    setVariantGallery((current) => {
      if (!current) return current;
      return {
        ...current,
        activeIndex: current.activeIndex === current.assets.length - 1 ? 0 : current.activeIndex + 1,
      };
    });
  }

  async function save(mode: "draft" | "publish") {
    if (!product) return;

    const nextErrors = validateCreateProduct({
      mode,
      values,
      attributes,
      products: products.filter((entry) => entry.id !== product.id),
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
                const { file: _, ...rest } = media;
                return rest;
              }
              const uploaded = await uploadProductVariantMedia(
                media.file,
                media.widthPx,
                media.heightPx,
              );
              return uploaded;
            }),
          );
          return { ...variant, media: uploadedMedia };
        }),
      );

      const submission: CreateProductSubmission = {
        mode,
        values,
        attributes,
        variantRows: variantRowsWithUploadedMedia,
      };

      const updated = updateProduct(product.id, (current) =>
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
            flash: `${updated.title} was updated as ${
              mode === "publish" ? updated.status.toLowerCase() : "draft"
            }.`,
          },
        });
      });
    } catch (error) {
      setVariantMediaError(
        error instanceof Error ? error.message : "Unable to upload variant media during save.",
      );
    } finally {
      setIsSubmittingMedia(false);
    }
  }

  return {
    product,
    products,
    errors,
    values,
    attributes,
    variantMediaError,
    processingVariantKeys,
    isSubmittingMedia,
    fileInputRefs,
    variantGallery,
    variantPreview,
    effectiveVariantRows,
    publishReady,
    setValue,
    updateAttribute,
    addAttributeRow,
    removeAttributeRow,
    buildVariantSignature,
    handleVariantMediaUpload,
    handleDeleteVariantMedia,
    openVariantGallery,
    closeVariantGallery,
    showPreviousGalleryAsset,
    showNextGalleryAsset,
    save,
  };
}
