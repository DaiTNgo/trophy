import type { CatalogProduct } from "../types";
import { backendFetch } from "./fetch";

type ApiProduct = {
  id: number;
  title: string;
  handle: string;
  subtitle: string | null;
  description: string | null;
  status: "Draft" | "Proposed" | "Published" | "Rejected";
  categories: Array<{ id: number; name: string }>;
  tags: Array<{ id: number; value: string }>;
  type: { id: number; value: string } | null;
  collection: { id: number; title: string } | null;
  attributes: Array<{ name: string; value: string }>;
  media: Array<{ url: string }>;
  options: Array<{
    id: number;
    title: string;
    values: Array<{ id: number; value: string }>;
  }>;
  variants: Array<{
    id: number;
    title: string;
    sku: string | null;
    priceAmount: number | null;
    inventoryQuantity: number;
    allowBackorder: boolean;
    media: Array<{
      id: string;
      fileName: string;
      mimeType: string;
      widthPx: number;
      heightPx: number;
      byteSize: number;
      contentUrl: string;
    }>;
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

type CreateFullProductPayload = {
  mode: "draft" | "publish";
  details: {
    title: string;
    subtitle: string | null;
    handle: string | null;
    description: string | null;
  };
  organization: {
    typeId?: number | null;
    collectionId?: number | null;
    categoryIds?: number[];
    tagValues?: string[];
  };
  attributes: Array<{ name: string; value: string; unit?: string | null }>;
  options: Array<{ title: string; values: string[] }>;
  variants: Array<{
    title: string;
    sku: string | null;
    priceAmount: number | null;
    inventoryQuantity: number;
    allowBackorder: boolean;
    isDefault?: boolean;
    optionValues: Array<{ optionTitle: string; value: string }>;
    media: Array<{ assetId: string }>;
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
  const response = await backendFetch("/api/admin/products/full-create", {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const body = (await response.json().catch(() => null)) as
    | { item?: ApiProduct; error?: string }
    | null;

  if (!response.ok || !body?.item) {
    throw new Error(body?.error || "Unable to create product.");
  }

  return body.item;
}

export async function fetchProducts() {
  const response = await backendFetch("/api/admin/products", {
    method: "GET",
    credentials: "include",
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
    credentials: "include",
  });

  const body = (await response.json().catch(() => null)) as
    | { item?: ApiProduct; error?: string }
    | null;

  if (!response.ok || !body?.item) {
    throw new Error(body?.error || "Unable to fetch product.");
  }

  return body.item;
}

export async function updateProductOverview(id: string, payload: {
  title?: string;
  subtitle?: string | null;
  handle?: string | null;
  description?: string | null;
}) {
  const response = await backendFetch(`/api/admin/products/${id}`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error("Failed to update product overview.");
  const body = await response.json();
  return body.item as ApiProduct;
}

export async function updateProductOrganization(id: string, payload: {
  typeId?: number | null;
  collectionId?: number | null;
  categoryIds?: number[];
  tagIds?: number[];
}) {
  const response = await backendFetch(`/api/admin/products/${id}/organize`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error("Failed to update product organization.");
  const body = await response.json();
  return body.item as ApiProduct;
}

export async function updateProductAttributes(id: string, items: Array<{ name: string; value: string; unit?: string | null }>) {
  const response = await backendFetch(`/api/admin/products/${id}/attributes`, {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items }),
  });
  if (!response.ok) throw new Error("Failed to update product attributes.");
  const body = await response.json();
  return body.item as ApiProduct;
}

// Legacy full-replace helper kept for create-flow compatibility. Product detail must use
// the operation-specific option methods below.
export async function updateProductOptions(id: string, items: Array<{ title: string; values: string[] }>) {
  const response = await backendFetch(`/api/admin/products/${id}/options`, {
    method: "PUT",
    credentials: "include",
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
  payload: { title: string; values?: string[] },
) {
  const response = await backendFetch(`/api/admin/products/${id}/options`, {
    method: "POST",
    credentials: "include",
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
  payload: { title: string },
) {
  const response = await backendFetch(`/api/admin/products/${id}/options/${optionId}`, {
    method: "PATCH",
    credentials: "include",
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
    credentials: "include",
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
  payload: { value: string },
) {
  const response = await backendFetch(`/api/admin/products/${id}/options/${optionId}/values`, {
    method: "POST",
    credentials: "include",
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
  payload: { value: string },
) {
  const response = await backendFetch(`/api/admin/products/${id}/option-values/${valueId}`, {
    method: "PATCH",
    credentials: "include",
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
    credentials: "include",
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
  title: string;
  sku: string | null;
  priceAmount: number | null;
  inventoryQuantity?: number;
  allowBackorder?: boolean;
  isDefault?: boolean;
  optionValueIds: number[];
  media?: Array<{ assetId: string }>;
}>) {
  const response = await backendFetch(`/api/admin/products/${id}/variants`, {
    method: "PUT",
    credentials: "include",
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
    title: string;
    sku: string | null;
    priceAmount: number | null;
    inventoryQuantity: number;
    allowBackorder: boolean;
    optionValueIds: number[];
    media?: Array<{ assetId: string }>;
  },
) {
  const response = await backendFetch(`/api/admin/products/${id}/variants`, {
    method: "POST",
    credentials: "include",
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
    title: string;
    sku: string | null;
    allowBackorder: boolean;
    optionValueIds?: number[];
  },
) {
  const response = await backendFetch(`/api/admin/products/${id}/variants/${variantId}`, {
    method: "PATCH",
    credentials: "include",
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
    credentials: "include",
  });
  if (!response.ok) {
    const err = await response.json().catch(() => null);
    throw new Error(err?.error || "Failed to delete product variant.");
  }
  const body = await response.json();
  return body.item as ApiProduct;
}

export async function updateProductVariantPrices(
  id: string,
  items: Array<{ id: number; priceAmount: number | null }>,
) {
  const response = await backendFetch(`/api/admin/products/${id}/variants/prices`, {
    method: "PATCH",
    credentials: "include",
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
    credentials: "include",
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
    credentials: "include",
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

export async function updateProductMedia(id: string, items: Array<{ url: string }>) {
  const response = await backendFetch(`/api/admin/products/${id}/media`, {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items }),
  });
  if (!response.ok) throw new Error("Failed to update product media.");
  const body = await response.json();
  return body.item as ApiProduct;
}

export async function updateProductCustomization(id: string, payload: {
  enabled: boolean;
  layers?: unknown[];
  formFields?: unknown[];
}) {
  const response = await backendFetch(`/api/admin/products/${id}/customization`, {
    method: "PUT",
    credentials: "include",
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
    credentials: "include",
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
    credentials: "include",
  });
  if (!response.ok) throw new Error("Failed to archive product.");
  const body = await response.json();
  return body.item as ApiProduct;
}

export function mapApiProductToCatalogProduct(product: Partial<ApiProduct> & Pick<ApiProduct, 'id' | 'title' | 'handle' | 'status' | 'updatedAt'>): CatalogProduct {
  const variants = (product.variants || []).map((variant) => ({
    id: String(variant.id),
    title: variant.title,
    sku: variant.sku ?? "",
    price: variant.priceAmount ?? 0,
    inventory: variant.inventoryQuantity,
    options: (variant.optionValueIds || []).map((id) => {
      let optionTitle = "Unknown";
      let optionValue = "Unknown";
      (product.options || []).forEach((opt) => {
        const val = (opt.values || []).find((v) => v.id === id);
        if (val) {
          optionTitle = opt.title;
          optionValue = val.value;
        }
      });
      return { option: optionTitle, value: optionValue, optionValueId: id };
    }),
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
    shouldCreate: true,
  }));

  const leadPrice = variants[0]?.price ?? 0;

  return {
    id: String(product.id),
    title: product.title,
    handle: product.handle,
    subtitle: product.subtitle ?? "",
    description: product.description ?? "",
    status: product.status === "Published" ? "Published" : "Draft",
    inventory: 0,
    price: leadPrice,
    category: product.categories?.[0]?.name ?? "",
    collection: product.collection?.title ?? "",
    collectionId: product.collection?.id ?? null,
    type: product.type?.value ?? "",
    categories: (product.categories || []).map((category) => category.name),
    categoryIds: (product.categories || []).map((category) => category.id),
    tags: (product.tags || []).map((tag) => tag.value),
    media: (product.media || []).map((m) => m.url),
    attributes: (product.attributes || []).map((a) => ({
      key: a.name,
      value: a.value,
    })),
    optionDefinitions: (product.options || []).map((option) => ({
      id: String(option.id),
      title: option.title,
      values: (option.values || []).map((value) => ({
        id: String(value.id),
        value: value.value,
      })),
    })),
    variants,
    customization: product.customization ?? null,
    updatedAt: product.updatedAt,
  };
}
