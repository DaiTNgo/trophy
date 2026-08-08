import type { CatalogProduct, LocalizedTextValue, ProductVariantMedia } from "../types";
import { backendClient } from "./backend-client";
import { backendFetch } from "./fetch";

type LocalizedInput = string | { vi: string; en?: string | null };

const toLocalized = (v: LocalizedInput | null | undefined): LocalizedTextValue => {
  if (!v) return { vi: "", en: "" };
  if (typeof v === "string") return { vi: v, en: "" };
  return { vi: v.vi ?? "", en: v.en ?? "" };
};

type ApiProduct = {
  id: number;
  title: LocalizedInput;
  handle: string;
  subtitle: LocalizedInput | null;
  description: LocalizedInput | null;
  status: "draft" | "published" | "archived" | "proposed" | "rejected";
  categories: Array<{ id: number; name: LocalizedInput }>;
  collection: { id: number; title: LocalizedInput } | null;
  attributes: Array<{ name: LocalizedInput; value: LocalizedInput }>;
  thumbnailAssetId?: string | null;
  media: Array<{
    assetId: string;
    fileName: string;
    mimeType: string;
    widthPx: number | null;
    heightPx: number | null;
    byteSize: number;
    contentUrl: string;
  }>;
  options: Array<{
    id: number;
    title: LocalizedInput;
    values: Array<{ id: number; value: LocalizedInput }>;
  }>;
  variants: Array<{
    id: number;
    title: LocalizedInput;
    sku: string | null;
    misaProductId: number | null;
    misaSyncStatus: "pending" | "synced" | "failed";
    misaLastError: string | null;
    priceAmount: number | null;
    inventoryQuantity: number;
    allowBackorder: boolean;
    attributes?: Array<{ name: LocalizedInput; value: LocalizedInput; unit?: string | null }>;
    media: Array<{
      id: string;
      fileName: string;
      mimeType: string;
      widthPx: number;
      heightPx: number;
      byteSize: number;
      contentUrl: string;
    }>;
    customizationMedia: {
      id: string;
      fileName: string;
      mimeType: string;
      widthPx: number;
      heightPx: number;
      byteSize: number;
      contentUrl: string;
    } | null;
    optionValueIds: number[];
  }>;
  customization: {
    enabled: boolean;
    canvasWidthPx: number | null;
    canvasHeightPx: number | null;
    layers: unknown[];
    formFields: unknown[];
    layerCount: number;
    formFieldCount: number;
  } | null;
  updatedAt: string;
};

type ApiManagedVariantMedia = {
  id: number;
  media: Array<{
    id: string;
    fileName: string;
    mimeType: string;
    widthPx: number;
    heightPx: number;
    byteSize: number;
    contentUrl: string;
  }>;
  customizationMedia: ApiManagedVariantMedia["media"][number] | null;
};

export type ManagedVariantMedia = {
  id: string;
  media: ProductVariantMedia[];
  customizationMedia: ProductVariantMedia | null;
};

function mapApiProductStatus(status: ApiProduct["status"]): CatalogProduct["status"] {
  switch (status) {
    case "published":
      return "Published";
    case "proposed":
      return "Proposed";
    case "rejected":
      return "Rejected";
    case "draft":
    case "archived":
      return "Draft";
  }
}

export type CreateFullProductPayload = {
  mode: "draft" | "publish";
  details: {
    title: LocalizedInput;
    subtitle?: LocalizedInput | null;
    handle: string | null;
    description?: LocalizedInput | null;
  };
  organization: {
    collectionId?: number | null;
    categoryIds?: number[];
  };
  attributes: Array<{ name: LocalizedInput; value: LocalizedInput; unit?: string | null }>;
  options: Array<{ title: LocalizedInput; values: Array<{ value: LocalizedInput }> }>;
  variants: Array<{
    title: LocalizedInput;
    sku: string | null;
    priceAmount: number | null;
    inventoryQuantity: number;
    allowBackorder: boolean;
    isDefault?: boolean;
    optionValues: Array<{ optionTitle: string; value: string }>;
    attributes?: Array<{ name: LocalizedInput; value: LocalizedInput; unit?: string | null }>;
    media: Array<{ mediaId: string; file: File }>;
    customizationMedia?: { mediaId: string; file: File } | null;
  }>;
  customization?: {
    enabled: boolean;
    canvasWidthPx?: number | null;
    canvasHeightPx?: number | null;
    layers: unknown[];
    formFields: unknown[];
  } | null;
};

export async function createFullProduct(payload: CreateFullProductPayload) {
  const formData = new FormData();
  const multipartPayload = {
    ...payload,
    variants: payload.variants.map((variant) => ({
      ...variant,
      media: variant.media.map(({ mediaId }) => ({ mediaId })),
      customizationMedia: variant.customizationMedia
        ? { mediaId: variant.customizationMedia.mediaId }
        : null,
    })),
  };
  formData.append("payload", JSON.stringify(multipartPayload));
  payload.variants.forEach((variant) => {
    variant.media.forEach(({ mediaId, file }) => formData.append(mediaId, file));
    if (variant.customizationMedia) {
      formData.append(variant.customizationMedia.mediaId, variant.customizationMedia.file);
    }
  });
  const response = await backendFetch("/api/admin/products/full-create", {
    method: "POST",
    body: formData,
  });

  const body = (await response.json().catch(() => null)) as
    | { item?: ApiProduct; error?: string }
    | null;

  if (!response.ok || !body?.item) {
    throw new Error(body?.error || "Unable to create product.");
  }

  return body.item;
}

export async function fetchProducts(params?: { categoryId?: string; collectionId?: string; q?: string }) {
  const url = new URL("/api/admin/products", "http://localhost");
  if (params?.categoryId) url.searchParams.set("categoryId", params.categoryId);
  if (params?.collectionId) url.searchParams.set("collectionId", params.collectionId);
  if (params?.q) url.searchParams.set("q", params.q);

  const response = await backendFetch(url.pathname + url.search, {
    method: "GET",

  });

  const body = (await response.json().catch(() => null)) as
    | { items?: ApiProduct[]; error?: string }
    | null;

  if (!response.ok || !body?.items) {
    throw new Error(body?.error || "Unable to fetch products.");
  }

  return body.items;
}

export async function fetchProduct(id: string) {
  const response = await backendFetch(`/api/admin/products/${id}`, {
    method: "GET",

  });

  const body = (await response.json().catch(() => null)) as
    | { item?: ApiProduct; error?: string }
    | null;

  if (!response.ok || !body?.item) {
    throw new Error(body?.error || "Unable to fetch product.");
  }

  return body.item;
}

export async function assignProductsToCollection(
  collectionId: string,
  payload: { addProductIds?: number[]; removeProductIds?: number[] }
) {
  const response = await backendFetch(`/api/admin/product-metadata/collections/${collectionId}/products`, {
    method: "POST",

    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error("Failed to assign products to collection.");
  return response.json();
}

export async function assignProductsToCategory(
  categoryId: string,
  payload: { addProductIds?: number[]; removeProductIds?: number[] }
) {
  const response = await backendFetch(`/api/admin/product-metadata/categories/${categoryId}/products`, {
    method: "POST",

    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error("Failed to assign products to category.");
  return response.json();
}

export async function updateProductOverview(id: string, payload: {
  title?: { vi: string; en?: string } | null;
  subtitle?: { vi?: string; en?: string } | null;
  handle?: string | null;
  description?: { vi?: string; en?: string } | null;
}) {
  const response = await backendFetch(`/api/admin/products/${id}`, {
    method: "PATCH",

    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error("Failed to update product overview.");
  const body = await response.json();
  return body.item as ApiProduct;
}

export async function updateProductOrganization(id: string, payload: {
  collectionId?: number | null;
  categoryIds?: number[];
}) {
  const response = await backendFetch(`/api/admin/products/${id}/organize`, {
    method: "PATCH",

    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error("Failed to update product organization.");
  const body = await response.json();
  return body.item as ApiProduct;
}

export async function updateProductAttributes(id: string, items: Array<{ name: { vi: string; en?: string }; value: { vi: string; en?: string }; unit?: string | null }>) {
  const response = await backendFetch(`/api/admin/products/${id}/attributes`, {
    method: "PUT",

    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items }),
  });
  if (!response.ok) throw new Error("Failed to update product attributes.");
  const body = await response.json();
  return body.item as ApiProduct;
}

// Legacy full-replace helper kept for create-flow compatibility. Product detail must use
// the operation-specific option methods below.
export async function updateProductOptions(id: string, items: Array<{ title: { vi: string; en?: string }; values: { vi: string; en?: string }[] }>) {
  const response = await backendFetch(`/api/admin/products/${id}/options`, {
    method: "PUT",

    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => null);
    throw new Error(err?.error || "Failed to update product options.");
  }
  const body = await response.json();
  return body.item as ApiProduct;
}

export async function createProductOption(
  id: string,
  payload: { title: { vi: string; en?: string }; values?: Array<{ value: { vi: string; en?: string } }> },
) {
  const response = await backendFetch(`/api/admin/products/${id}/options`, {
    method: "POST",

    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => null);
    throw new Error(err?.error || "Failed to create product option.");
  }
  const body = await response.json();
  return body.item as ApiProduct;
}

export async function updateProductOption(
  id: string,
  optionId: number,
  payload: { title: { vi: string; en?: string } },
) {
  const response = await backendFetch(`/api/admin/products/${id}/options/${optionId}`, {
    method: "PATCH",

    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => null);
    throw new Error(err?.error || "Failed to update product option.");
  }
  const body = await response.json();
  return body.item as ApiProduct;
}

export async function deleteProductOption(id: string, optionId: number) {
  const response = await backendFetch(`/api/admin/products/${id}/options/${optionId}`, {
    method: "DELETE",

  });
  if (!response.ok) {
    const err = await response.json().catch(() => null);
    throw new Error(err?.error || "Failed to delete product option.");
  }
  const body = await response.json();
  return body.item as ApiProduct;
}

export async function createProductOptionValue(
  id: string,
  optionId: number,
  payload: { value: { vi: string; en?: string } },
) {
  const response = await backendFetch(`/api/admin/products/${id}/options/${optionId}/values`, {
    method: "POST",

    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => null);
    throw new Error(err?.error || "Failed to create option value.");
  }
  const body = await response.json();
  return body.item as ApiProduct;
}

export async function updateProductOptionValue(
  id: string,
  valueId: number,
  payload: { value: { vi: string; en?: string } },
) {
  const response = await backendFetch(`/api/admin/products/${id}/option-values/${valueId}`, {
    method: "PATCH",

    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => null);
    throw new Error(err?.error || "Failed to update option value.");
  }
  const body = await response.json();
  return body.item as ApiProduct;
}

export async function deleteProductOptionValue(id: string, valueId: number) {
  const response = await backendFetch(`/api/admin/products/${id}/option-values/${valueId}`, {
    method: "DELETE",

  });
  if (!response.ok) {
    const err = await response.json().catch(() => null);
    throw new Error(err?.error || "Failed to delete option value.");
  }
  const body = await response.json();
  return body.item as ApiProduct;
}

// Legacy full-replace helper kept for create-flow compatibility. Product detail must use
// the operation-specific variant methods below.
export async function updateProductVariants(id: string, items: Array<{
  id?: number;
  title: LocalizedInput;
  sku: string | null;
  priceAmount: number | null;
  inventoryQuantity?: number;
  allowBackorder?: boolean;
  isDefault?: boolean;
  optionValueIds: number[];
  media?: Array<{ assetId: string }>;
  customizationMedia?: { assetId: string } | null;
}>) {
  const response = await backendFetch(`/api/admin/products/${id}/variants`, {
    method: "PUT",

    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => null);
    throw new Error(err?.error || "Failed to update product variants.");
  }
  const body = await response.json();
  return body.item as ApiProduct;
}

export async function createProductVariant(
  id: string,
  payload: {
    title: LocalizedInput;
    sku: string | null;
    priceAmount: number | null;
    inventoryQuantity: number;
    allowBackorder: boolean;
    optionValueIds: number[];
    attributes?: Array<{ name: LocalizedInput; value: LocalizedInput; unit?: string | null }>;
    media?: Array<{ assetId: string }>;
    customizationMedia?: { assetId: string } | null;
  },
) {
  const response = await backendFetch(`/api/admin/products/${id}/variants`, {
    method: "POST",

    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => null);
    throw new Error(err?.error || "Failed to create product variant.");
  }
  const body = await response.json();
  return body.item as ApiProduct;
}

export async function updateProductVariantDetails(
  id: string,
  variantId: number,
  payload: {
    title: LocalizedInput;
    sku: string | null;
    allowBackorder: boolean;
    optionValueIds?: number[];
    attributes?: Array<{ name: LocalizedInput; value: LocalizedInput; unit?: string | null }>;
  },
) {
  const response = await backendFetch(`/api/admin/products/${id}/variants/${variantId}`, {
    method: "PATCH",

    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => null);
    throw new Error(err?.error || "Failed to update variant details.");
  }
  const body = await response.json();
  return body.item as ApiProduct;
}

export async function deleteProductVariant(id: string, variantId: number) {
  const response = await backendFetch(`/api/admin/products/${id}/variants/${variantId}`, {
    method: "DELETE",

  });
  if (!response.ok) {
    const err = await response.json().catch(() => null);
    throw new Error(err?.error || "Failed to delete product variant.");
  }
  const body = await response.json();
  return body.item as ApiProduct;
}

export async function syncProductVariantToMisa(
  id: string,
  variantId: number,
): Promise<{ item: ApiProduct; sync: { status: "synced" | "failed"; error: string | null } }> {
  const response = await backendClient.api.admin.products[":id"].variants[":variantId"]["misa-sync"].$post({
    param: { id, variantId: String(variantId) },
  });
  const body = await response.json() as {
    item?: ApiProduct;
    sync?: { status: "synced" | "failed"; error: string | null };
    error?: string;
  };
  if (!response.ok || !body.item || !body.sync) {
    throw new Error(body.error || "Failed to synchronize the variant with MISA.");
  }
  return { item: body.item, sync: body.sync };
}

export async function updateProductVariantPrices(
  id: string,
  items: Array<{ id: number; priceAmount: number | null }>,
) {
  const response = await backendFetch(`/api/admin/products/${id}/variants/prices`, {
    method: "PATCH",

    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => null);
    throw new Error(err?.error || "Failed to update variant prices.");
  }
  const body = await response.json();
  return body.item as ApiProduct;
}

export async function updateProductVariantStock(
  id: string,
  items: Array<{ id: number; inventoryQuantity: number }>,
) {
  const response = await backendFetch(`/api/admin/products/${id}/variants/stock`, {
    method: "PATCH",

    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => null);
    throw new Error(err?.error || "Failed to update variant stock.");
  }
  const body = await response.json();
  return body.item as ApiProduct;
}

export async function updateProductVariantMedia(
  id: string,
  variantId: number,
  items: Array<{ assetId: string }>,
) {
  const response = await backendFetch(`/api/admin/products/${id}/variants/${variantId}/media`, {
    method: "PUT",

    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => null);
    throw new Error(err?.error || "Failed to update variant media.");
  }
  const body = await response.json();
  return body.item as ApiProduct;
}

export async function updateProductVariantCustomizationMedia(
  id: string,
  variantId: number,
  assetId: string,
) {
  const response = await backendFetch(
    `/api/admin/products/${id}/variants/${variantId}/customization-media`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assetId }),
    },
  );
  if (!response.ok) {
    const err = await response.json().catch(() => null);
    throw new Error(err?.error || "Failed to update customization media.");
  }
  const body = await response.json();
  return body.item as ApiProduct;
}

async function readProductCommandResponse(response: Response, fallback: string) {
  const body = await response.json().catch(() => null) as { item?: ApiProduct; error?: string } | null;
  if (!response.ok || !body?.item) throw new Error(body?.error || fallback);
  return body.item;
}

async function readManagedVariantMediaResponse(response: Response, fallback: string): Promise<ManagedVariantMedia> {
  const body = await response.json().catch(() => null) as { variant?: ApiManagedVariantMedia; error?: string } | null;
  if (!response.ok || !body?.variant) throw new Error(body?.error || fallback);
  const toMedia = (media: ApiManagedVariantMedia["media"][number]): ProductVariantMedia => ({ ...media });
  return {
    id: String(body.variant.id),
    media: body.variant.media.map(toMedia),
    customizationMedia: body.variant.customizationMedia ? toMedia(body.variant.customizationMedia) : null,
  };
}

export async function uploadProductMedia(id: string, files: File[]) {
  const formData = new FormData();
  files.forEach((file) => formData.append("files", file));
  const response = await backendFetch(`/api/admin/products/${id}/media/upload`, { method: "POST", body: formData });
  return readProductCommandResponse(response, "Failed to upload Product Media.");
}

export async function setProductThumbnail(id: string, assetId: string | null) {
  const response = await backendFetch(`/api/admin/products/${id}/thumbnail`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ assetId }) });
  return readProductCommandResponse(response, "Failed to set Product Thumbnail.");
}

export async function uploadManagedVariantMedia(id: string, variantId: number, files: File[]) {
  const formData = new FormData(); files.forEach((file) => formData.append("files", file));
  const response = await backendFetch(`/api/admin/products/${id}/variants/${variantId}/media/upload`, { method: "POST", body: formData });
  return readManagedVariantMediaResponse(response, "Failed to upload Variant Media.");
}

export async function removeManagedVariantMedia(id: string, variantId: number, assetId: string) {
  const response = await backendClient.api.admin.products[":id"].variants[":variantId"].media[":assetId"].$delete({
    param: { id, variantId: String(variantId), assetId },
  });
  return readManagedVariantMediaResponse(response, "Failed to remove Variant Media.");
}

export async function replaceVariantCustomizationBackground(id: string, variantId: number, file: File) {
  const formData = new FormData(); formData.append("files", file);
  const response = await backendFetch(`/api/admin/products/${id}/variants/${variantId}/customization-media/replace`, { method: "POST", body: formData });
  return readManagedVariantMediaResponse(response, "Failed to replace Customization Background.");
}

export async function updateProductCustomization(id: string, payload: {
  enabled: boolean;
  layers?: unknown[];
  formFields?: unknown[];
}) {
  const response = await backendFetch(`/api/admin/products/${id}/customization`, {
    method: "PUT",

    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => null);
    throw new Error(err?.error || "Failed to update customization.");
  }
  const body = await response.json();
  return body.item as ApiProduct;
}

export async function publishProduct(id: string) {
  const response = await backendFetch(`/api/admin/products/${id}/publish`, {
    method: "POST",

  });
  if (!response.ok) {
    const err = await response.json().catch(() => null);
    throw new Error(err?.error || "Failed to publish product.");
  }
  const body = await response.json();
  return body.item as ApiProduct;
}

export async function archiveProduct(id: string) {
  const response = await backendFetch(`/api/admin/products/${id}/archive`, {
    method: "POST",

  });
  if (!response.ok) throw new Error("Failed to archive product.");
  const body = await response.json();
  return body.item as ApiProduct;
}

export async function deleteProduct(id: string) {
  const response = await backendClient.api.admin.products[":id"].$delete({ param: { id } });
  const body = await response.json().catch(() => null) as { error?: string } | null;
  if (!response.ok) throw new Error(body?.error || "Failed to delete product.");
  return body;
}

export type TrashedProduct = {
  id: string;
  title: LocalizedTextValue;
  handle: string;
  status: ApiProduct["status"];
  deletedAt: string;
};

export async function fetchTrashedProducts(): Promise<TrashedProduct[]> {
  const response = await backendClient.api.admin.products.trash.$get();
  const body = await response.json().catch(() => null) as {
    items?: Array<{ id: number; title: LocalizedInput; handle: string; status: ApiProduct["status"]; deletedAt: string | null }>;
    error?: string;
  } | null;
  if (!response.ok || !body?.items) throw new Error(body?.error || "Unable to fetch product trash.");

  return body.items.flatMap((product) => product.deletedAt ? [{
    id: String(product.id),
    title: toLocalized(product.title),
    handle: product.handle,
    status: product.status,
    deletedAt: product.deletedAt,
  }] : []);
}

export async function restoreProduct(id: string) {
  const response = await backendClient.api.admin.products[":id"].restore.$post({ param: { id } });
  const body = await response.json().catch(() => null) as { error?: string } | null;
  if (!response.ok) throw new Error(body?.error || "Failed to restore product.");
}

export async function permanentlyDeleteProduct(id: string) {
  const response = await backendClient.api.admin.products[":id"].permanent.$delete({ param: { id } });
  const body = await response.json().catch(() => null) as { error?: string } | null;
  if (!response.ok) throw new Error(body?.error || "Failed to permanently delete product.");
}

export function mapApiProductToCatalogProduct(product: Partial<ApiProduct> & Pick<ApiProduct, 'id' | 'title' | 'handle' | 'status' | 'updatedAt'>): CatalogProduct {
  const variants = (product.variants || []).map((variant) => ({
    id: String(variant.id),
    title: toLocalized(variant.title).vi,
    titleTranslations: toLocalized(variant.title),
    sku: variant.sku ?? "",
    misaSyncStatus: variant.misaSyncStatus,
    misaLastError: variant.misaLastError,
    price: variant.priceAmount ?? 0,
    inventory: variant.inventoryQuantity,
    options: (variant.optionValueIds || []).map((id) => {
      let optionTitle = "Unknown";
      let optionValue = "Unknown";
      (product.options || []).forEach((opt) => {
        const val = (opt.values || []).find((v) => v.id === id);
        if (val) {
          optionTitle = toLocalized(opt.title).vi;
          optionValue = toLocalized(val.value).vi;
        }
      });
      return { option: optionTitle, value: optionValue, optionValueId: id };
    }),
    attributes: (variant.attributes || []).map((attribute) => ({
      key: toLocalized(attribute.name),
      value: toLocalized(attribute.value),
    })),
    allowBackorder: variant.allowBackorder,
    media: (variant.media || []).map((asset) => ({
      id: asset.id,
      fileName: asset.fileName,
      mimeType: asset.mimeType,
      widthPx: asset.widthPx,
      heightPx: asset.heightPx,
      byteSize: asset.byteSize,
      contentUrl: asset.contentUrl,
    })),
    customizationMedia: variant.customizationMedia
      ? {
          id: variant.customizationMedia.id,
          fileName: variant.customizationMedia.fileName,
          mimeType: variant.customizationMedia.mimeType,
          widthPx: variant.customizationMedia.widthPx,
          heightPx: variant.customizationMedia.heightPx,
          byteSize: variant.customizationMedia.byteSize,
          contentUrl: variant.customizationMedia.contentUrl,
        }
      : null,
    shouldCreate: true,
  }));

  const leadPrice = variants[0]?.price ?? 0;

  return {
    id: String(product.id),
    title: toLocalized(product.title),
    handle: product.handle,
    subtitle: toLocalized(product.subtitle),
    description: toLocalized(product.description),
    status: mapApiProductStatus(product.status),
    inventory: 0,
    price: leadPrice,
    category: toLocalized(product.categories?.[0]?.name).vi,
    collection: toLocalized(product.collection?.title).vi,
    collectionId: product.collection?.id ?? null,
    categories: (product.categories || []).map((c) => toLocalized(c.name).vi),
    categoryIds: (product.categories || []).map((c) => c.id),
    media: (product.media || []).map((media) => ({
      id: media.assetId,
      fileName: media.fileName,
      mimeType: media.mimeType,
      widthPx: media.widthPx ?? 0,
      heightPx: media.heightPx ?? 0,
      byteSize: media.byteSize,
      contentUrl: media.contentUrl,
    })),
    thumbnailAssetId: product.thumbnailAssetId ?? null,
    attributes: (product.attributes || []).map((a) => ({
      key: toLocalized(a.name),
      value: toLocalized(a.value),
    })),
    optionDefinitions: (product.options || []).map((option) => ({
      id: String(option.id),
      title: toLocalized(option.title).vi,
      titleTranslations: toLocalized(option.title),
      values: (option.values || []).map((value) => ({
        id: String(value.id),
        value: toLocalized(value.value).vi,
        valueTranslations: toLocalized(value.value),
      })),
    })),
    variants,
    customization: product.customization ?? null,
    updatedAt: product.updatedAt,
  };
}
