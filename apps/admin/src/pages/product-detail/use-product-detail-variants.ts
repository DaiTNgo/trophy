import { useState } from "react";
import { toast } from "@medusajs/ui";
import { createLocalizedText } from "../../components/ui/medusa";
import {
  createProductVariant,
  deleteProductVariant,
  syncProductVariantToMisa,
  updateProductVariantDetails,
  updateProductVariantPrices,
  updateProductVariantStock,
} from "../../lib/products-client";
import type { AdminLocale, CatalogProduct, LocalizedTextValue, ProductAttribute } from "../../types";

type ProductDetailVariantsProps = {
  product: CatalogProduct;
  mutate: () => Promise<void>;
};

export type VariantFormState = {
  id: number | null;
  titleTranslations: LocalizedTextValue;
  sku: string;
  priceAmount: string;
  inventoryQuantity: string;
  allowBackorder: boolean;
  optionSelections: Record<string, string>;
  attributes: ProductAttribute[];
};


function buildVariantForm(product: CatalogProduct, variant?: CatalogProduct["variants"][number]): VariantFormState {
  const optionSelections = Object.fromEntries(
    product.optionDefinitions.map((option) => {
      const selectedValue = variant?.options.find(
        (item) => String(item.optionValueId) && item.option === option.title,
      );
      return [option.id, selectedValue?.optionValueId ? String(selectedValue.optionValueId) : "__none__"];
    }),
  );

  const attributes = product.attributes.map((prodAttr) => {
    const variantAttr = variant?.attributes?.find((va) => va.key.vi === prodAttr.key.vi);
    return {
      key: { ...prodAttr.key },
      value: variantAttr ? { ...variantAttr.value } : { ...prodAttr.value },
    };
  });

  return {
    id: variant ? Number(variant.id) : null,
    titleTranslations: variant?.titleTranslations ?? createLocalizedText(variant?.title ?? ""),
    sku: variant?.sku ?? "",
    priceAmount: variant && variant.price > 0 ? String(variant.price) : "",
    inventoryQuantity: variant ? String(variant.inventory) : "0",
    allowBackorder: variant?.allowBackorder ?? false,
    optionSelections,
    attributes,
  };
}

export function useProductDetailVariants({ product, mutate }: ProductDetailVariantsProps) {
  const [priceOpen, setPriceOpen] = useState(false);
  const [stockOpen, setStockOpen] = useState(false);
  const [variantOpen, setVariantOpen] = useState(false);

  const [priceRows, setPriceRows] = useState<Array<{ id: number; title: string; priceAmount: string }>>([]);
  const [stockRows, setStockRows] = useState<Array<{ id: number; title: string; inventoryQuantity: string }>>([]);
  const [variantForm, setVariantForm] = useState<VariantFormState>(() => buildVariantForm(product));
  const [variantTitleLocale, setVariantTitleLocale] = useState<AdminLocale>("vi");
  const [variantAttributeLocale, setVariantAttributeLocale] = useState<AdminLocale>("vi");


  const [isSavingPrices, setIsSavingPrices] = useState(false);
  const [isSavingStock, setIsSavingStock] = useState(false);
  const [isSavingVariant, setIsSavingVariant] = useState(false);
  const [syncingMisaVariantId, setSyncingMisaVariantId] = useState<number | null>(null);


  function openPrices() {
    setPriceRows(
      product.variants.map((variant) => ({
        id: Number(variant.id),
        title: variant.title,
        priceAmount: variant.price > 0 ? String(variant.price) : "",
      })),
    );
    setPriceOpen(true);
  }

  function openStock() {
    setStockRows(
      product.variants.map((variant) => ({
        id: Number(variant.id),
        title: variant.title,
        inventoryQuantity: String(variant.inventory),
      })),
    );
    setStockOpen(true);
  }

  function openVariantEditor(variant?: CatalogProduct["variants"][number]) {
    setVariantForm(buildVariantForm(product, variant));
    setVariantTitleLocale("vi");
    setVariantAttributeLocale("vi");
    setVariantOpen(true);
  }

  function updateVariantAttribute(
    index: number,
    field: "key" | "value",
    value: LocalizedTextValue,
  ) {
    setVariantForm((current) => ({
      ...current,
      attributes: current.attributes.map((attribute, attributeIndex) =>
        attributeIndex === index ? { ...attribute, [field]: value } : attribute,
      ),
    }));
  }



  async function savePrices() {
    setIsSavingPrices(true);

    try {
      await updateProductVariantPrices(
        product.id,
        priceRows.map((row) => ({
          id: row.id,
          priceAmount: row.priceAmount.trim() === "" ? null : Number(row.priceAmount),
        })),
      );
      await mutate();
      setPriceOpen(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to save price changes.";
      toast.error("Variant prices could not be saved", {
        description: `${message} Enter a valid non-negative price for each variant, then try again.`,
      });
    } finally {
      setIsSavingPrices(false);
    }
  }

  async function saveStock() {
    setIsSavingStock(true);

    try {
      await updateProductVariantStock(
        product.id,
        stockRows.map((row) => ({
          id: row.id,
          inventoryQuantity: Number(row.inventoryQuantity || 0),
        })),
      );
      await mutate();
      setStockOpen(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to save stock changes.";
      toast.error("Variant stock could not be saved", {
        description: `${message} Enter a whole number greater than or equal to zero for each variant, then try again.`,
      });
    } finally {
      setIsSavingStock(false);
    }
  }

  async function saveVariant() {
    setIsSavingVariant(true);

    try {
      if (!variantForm.titleTranslations.vi.trim()) {
        throw new Error("Vietnamese variant title is required.");
      }

      const optionValueIds = product.optionDefinitions.map((option) => {
        const selected = variantForm.optionSelections[option.id];
        if (!selected || selected === "__none__") {
          throw new Error(`Choose a value for ${option.title}.`);
        }
        return Number(selected);
      });
      const normalizedAttributes = variantForm.attributes
        .filter((attribute, index) => {
          const productAttribute = product.attributes[index];
          if (!productAttribute) return true;
          return attribute.value.vi.trim() !== productAttribute.value.vi.trim() ||
                 attribute.value.en.trim() !== productAttribute.value.en.trim();
        })
        .map((attribute) => ({
          name: {
            vi: attribute.key.vi.trim(),
            en: attribute.key.en.trim(),
          },
          value: {
            vi: attribute.value.vi.trim(),
            en: attribute.value.en.trim(),
          },
        }));

      if (
        normalizedAttributes.some((attribute) => !attribute.name.vi || !attribute.value.vi)
      ) {
        throw new Error("Each variant attribute override needs a Vietnamese value.");
      }

      const priceAmount = variantForm.priceAmount.trim() === "" ? null : Number(variantForm.priceAmount);
      const inventoryQuantity = Number(variantForm.inventoryQuantity || 0);

      if (priceAmount !== null && (!Number.isFinite(priceAmount) || priceAmount < 0)) {
        throw new Error("Enter a valid variant price.");
      }

      if (!Number.isInteger(inventoryQuantity) || inventoryQuantity < 0) {
        throw new Error("Enter a valid inventory quantity.");
      }

      if (variantForm.id) {
        await updateProductVariantDetails(product.id, variantForm.id, {
          title: {
            vi: variantForm.titleTranslations.vi.trim(),
            en: variantForm.titleTranslations.en.trim(),
          },
          sku: variantForm.sku.trim() || null,
          allowBackorder: variantForm.allowBackorder,
          optionValueIds,
          attributes: normalizedAttributes,
        });
        await updateProductVariantPrices(product.id, [{ id: variantForm.id, priceAmount }]);
        await updateProductVariantStock(product.id, [{ id: variantForm.id, inventoryQuantity }]);
      } else {
        await createProductVariant(product.id, {
          title: {
            vi: variantForm.titleTranslations.vi.trim(),
            en: variantForm.titleTranslations.en.trim(),
          },
          sku: variantForm.sku.trim() || null,
          priceAmount,
          inventoryQuantity,
          allowBackorder: variantForm.allowBackorder,
          optionValueIds,
          attributes: normalizedAttributes,
          media: [],
          customizationMedia: null,
        });
      }

      await mutate();
      setVariantOpen(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to save variant details.";
      toast.error("Variant details could not be saved", {
        description: `${message} Complete the variant title, option values, attributes, price, and inventory fields, then try again.`,
      });
    } finally {
      setIsSavingVariant(false);
    }
  }

  async function handleDeleteVariant(variantId: number) {
    if (!window.confirm("Delete this product variant?")) {
      return;
    }

    try {
      await deleteProductVariant(product.id, variantId);
      await mutate();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to delete variant.";
      toast.error("Variant could not be deleted", {
        description: `${message} Refresh the product and try again.`,
      });
    }
  }

  async function handleSyncVariantToMisa(variantId: number) {
    setSyncingMisaVariantId(variantId);
    try {
      const result = await syncProductVariantToMisa(product.id, variantId);
      await mutate();
      if (result.sync.status === "synced") {
        toast.success("Variant synchronized with MISA");
      } else {
        toast.error("Variant could not be synchronized with MISA", {
          description: result.sync.error || "Review the MISA status and try again.",
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to synchronize the variant with MISA.";
      toast.error("Variant could not be synchronized with MISA", { description: message });
    } finally {
      setSyncingMisaVariantId(null);
    }
  }

  return {
    priceOpen, setPriceOpen, stockOpen, setStockOpen, variantOpen, setVariantOpen,
    priceRows, setPriceRows, stockRows, setStockRows, variantForm, setVariantForm,
    variantTitleLocale, setVariantTitleLocale, variantAttributeLocale, setVariantAttributeLocale,
    isSavingPrices, isSavingStock, isSavingVariant, syncingMisaVariantId,
    openPrices, openStock,
    openVariantEditor, updateVariantAttribute, savePrices, saveStock, saveVariant,
    handleDeleteVariant, handleSyncVariantToMisa,
  };
}
