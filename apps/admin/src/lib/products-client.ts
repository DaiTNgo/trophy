import type { CatalogProduct } from "../types";
import { backendFetch } from "./fetch";

type ApiProduct = {
  id: number;
  title: string;
  handle: string;
  subtitle: string | null;
  description: string | null;
  status: string;
  categories: Array<{ name: string }>;
  tags: Array<{ value: string }>;
  type: { value: string } | null;
  collection: { title: string } | null;
  attributes: Array<{ name: string; value: string }>;
  media: Array<{ url: string }>;
  options: Array<{
    title: string;
    values: Array<{ id: number; value: string }>;
  }>;
  variants: Array<{
    id: number;
    title: string;
    sku: string | null;
    priceAmount: number | null;
    media: Array<{
      id: string;
      fileName: string;
      mimeType: string;
      widthPx: number;
      heightPx: number;
      byteSize: number;
      contentUrl: string;
    }>;
    optionValues: Array<{ optionTitle: string | null; value: string }>;
  }>;
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

export function mapApiProductToCatalogProduct(product: ApiProduct): CatalogProduct {
  const variants = product.variants.map((variant) => ({
    id: String(variant.id),
    title: variant.title,
    sku: variant.sku ?? "",
    price: variant.priceAmount ?? 0,
    inventory: 0,
    options: variant.optionValues
      .filter((optionValue) => optionValue.optionTitle)
      .map((optionValue) => ({
        option: optionValue.optionTitle ?? "",
        value: optionValue.value,
      })),
    allowBackorder: false,
    media: variant.media.map((asset) => ({
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
    status: product.status === "published" ? "Published" : "Draft",
    inventory: 0,
    price: leadPrice,
    category: product.categories[0]?.name ?? "",
    collection: product.collection?.title ?? "",
    type: product.type?.value ?? "",
    categories: product.categories.map((category) => category.name),
    tags: product.tags.map((tag) => tag.value),
    media: product.media.map((media) => media.url),
    attributes: product.attributes.map((attribute) => ({
      key: attribute.name,
      value: attribute.value,
    })),
    optionDefinitions: product.options.map((option) => ({
      id: `option_${option.title}`,
      title: option.title,
      values: option.values.map((value) => ({
        id: String(value.id),
        value: value.value,
      })),
    })),
    variants,
    updatedAt: product.updatedAt,
  };
}
