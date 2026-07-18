import type { LocalizedTextValue } from "./translation";
import { fetchBackendWithLog } from "./observability";

const BACKEND_URL =
  (import.meta.env.VITE_BACKEND_URL as string | undefined)?.replace(/\/$/, "") ??
  "http://localhost:8787";

export function backendUrl(path: string) {
  return `${BACKEND_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

export function backendAssetUrl(path: string | null | undefined) {
  if (!path) return "";
  if (/^https?:\/\//i.test(path)) return path;
  return backendUrl(path);
}

export function backendFontUrl(assetId: string) {
  return backendUrl(`/api/storefront/brand-assets/fonts/file/${encodeURIComponent(assetId)}`);
}

export function backendStaticFontUrl(fileName: string) {
  return backendUrl(`/fonts/${encodeURIComponent(fileName)}`);
}

export type StorefrontCustomizationAsset = {
  id: string;
  widthPx: number;
  heightPx: number;
  contentUrl: string;
};

export async function uploadStorefrontCustomizationAsset(
  file: File,
  uploadToken: string,
): Promise<StorefrontCustomizationAsset> {
  const response = await fetchBackendWithLog("uploadStorefrontCustomizationAsset", backendUrl("/api/storefront/customizations/assets"), {
    method: "POST",
    headers: { "Content-Type": file.type, "X-Upload-Token": uploadToken },
    body: file,
  });
  const payload = (await response.json()) as {
    asset?: StorefrontCustomizationAsset;
    error?: string;
  };
  if (!response.ok || !payload.asset) {
    throw new Error(payload.error ?? "Upload failed.");
  }

  return {
    ...payload.asset,
    contentUrl: backendAssetUrl(payload.asset.contentUrl),
  };
}

export type StorefrontProductItem = {
  id: number;
  title: LocalizedTextValue;
  subtitle: LocalizedTextValue;
  handle: string;
  priceAmount: number | null;
  priceFrom: boolean;
  thumbnail: string | null;
  categorySummary: LocalizedTextValue;
  typeValue: LocalizedTextValue;
  customizable: boolean;
};

export type StorefrontListingResponse = {
  items: StorefrontProductItem[];
  page: number;
  limit: number;
  total: number;
};

export type StorefrontDetailResponse = {
  item: {
    id: number;
    title: LocalizedTextValue;
    subtitle: LocalizedTextValue;
    handle: string;
    description: LocalizedTextValue;
    hasVariants: boolean;
    type: { id: number; value: LocalizedTextValue } | null;
    categories: Array<{ id: number; name: LocalizedTextValue; handle: string; parentId: number | null }>;
    attributes: Array<{ id: number; productId: number; name: LocalizedTextValue; value: LocalizedTextValue; unit: string | null; position: number }>;
    options: Array<{ id: number; productId: number; title: LocalizedTextValue; position: number; values: Array<{ id: number; optionId: number; value: LocalizedTextValue; position: number }> }>;
    variants: Array<{
      id: number;
      title: LocalizedTextValue;
      sku: string | null;
      priceAmount: number | null;
      isDefault: boolean;
      position: number;
      media: Array<{
        id: string;
        assetId: string;
        fileName: string;
        mimeType: string;
        widthPx: number | null;
        heightPx: number | null;
        byteSize: number;
        position: number;
        contentUrl: string;
      }>;
      optionValues: Array<{ id: number; value: LocalizedTextValue; optionId: number; optionTitle: LocalizedTextValue }>;
    }>;
    customization: {
      enabled: boolean;
      canvasWidthPx: number | null;
      canvasHeightPx: number | null;
      layers: Array<Record<string, unknown>>;
      formFields: unknown[];
    } | null;
  };
};

export type StorefrontDynamicFont = {
  id: string;
  name: string;
  regularAssetId: string | null;
  boldAssetId: string | null;
  italicAssetId: string | null;
  boldItalicAssetId: string | null;
};

export async function fetchStorefrontProducts(params: {
  q?: string;
  category?: string;
  page?: number;
  limit?: number;
  locale?: string;
}): Promise<StorefrontListingResponse> {
  const searchParams = new URLSearchParams();
  if (params.q) searchParams.set("q", params.q);
  if (params.category) searchParams.set("category", params.category);
  if (params.page) searchParams.set("page", String(params.page));
  if (params.limit) searchParams.set("limit", String(params.limit));
  if (params.locale) searchParams.set("locale", params.locale);

  const qs = searchParams.toString();
  const url = backendUrl(`/api/storefront/products${qs ? `?${qs}` : ""}`);

  const res = await fetchBackendWithLog("fetchStorefrontProducts", url);

  if (!res.ok) {
    throw new Response("Failed to load products", { status: res.status });
  }

  const data: StorefrontListingResponse = await res.json();

  return {
    ...data,
    items: data.items.map((item) => ({
      ...item,
      thumbnail: backendAssetUrl(item.thumbnail) || null,
    })),
  };
}

export async function fetchStorefrontProduct(handle: string, locale?: string): Promise<StorefrontDetailResponse["item"]> {
  const url = backendUrl(`/api/storefront/products/${encodeURIComponent(handle)}${locale ? `?locale=${locale}` : ''}`);

  const res = await fetchBackendWithLog("fetchStorefrontProduct", url);

  if (!res.ok) {
    if (res.status === 404) {
      throw new Response("Not Found", { status: 404 });
    }
    throw new Response("Failed to load product", { status: res.status });
  }

  const data: StorefrontDetailResponse = await res.json();
  return {
    ...data.item,
    variants: data.item.variants.map((variant) => ({
      ...variant,
      media: variant.media.map((media) => ({
        ...media,
        contentUrl: backendAssetUrl(media.contentUrl),
      })),
    })),
  };
}

export async function fetchStorefrontDynamicFonts(): Promise<StorefrontDynamicFont[]> {
  const res = await fetchBackendWithLog("fetchStorefrontDynamicFonts", backendUrl("/api/storefront/brand-assets/fonts"));

  if (!res.ok) {
    throw new Response("Failed to load fonts", { status: res.status });
  }

  const data = (await res.json()) as { fonts?: StorefrontDynamicFont[] };
  return data.fonts ?? [];
}

export type StorefrontCategory = {
  id: number;
  name: LocalizedTextValue;
  handle: string;
  description: LocalizedTextValue;
  imageUrl: string | null;
  parentId: number | null;
};

export async function fetchStorefrontCategories(locale?: string): Promise<StorefrontCategory[]> {
  const res = await fetchBackendWithLog("fetchStorefrontCategories", backendUrl(`/api/storefront/categories${locale ? `?locale=${locale}` : ''}`));

  if (!res.ok) {
    throw new Response("Failed to load categories", { status: res.status });
  }

  const data = (await res.json()) as { items: StorefrontCategory[] };
  return data.items;
}

export type StorefrontCollection = {
  id: number;
  title: LocalizedTextValue;
  handle: string;
  description: LocalizedTextValue;
  imageUrl: string | null;
};

export async function fetchStorefrontCollections(locale?: string): Promise<StorefrontCollection[]> {
  const res = await fetchBackendWithLog("fetchStorefrontCollections", backendUrl(`/api/storefront/collections${locale ? `?locale=${locale}` : ''}`));

  if (!res.ok) {
    throw new Response("Failed to load collections", { status: res.status });
  }

  const data = (await res.json()) as { items: StorefrontCollection[] };
  return data.items;
}

export async function fetchStorefrontCollectionProducts(
  handle: string,
  params?: { page?: number; limit?: number; locale?: string; customizable?: "all" | "true" | "false" }
): Promise<StorefrontListingResponse> {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set("page", String(params.page));
  if (params?.limit) searchParams.set("limit", String(params.limit));
  if (params?.locale) searchParams.set("locale", params.locale);
  if (params?.customizable) searchParams.set("customizable", params.customizable);

  const qs = searchParams.toString();
  const url = backendUrl(`/api/storefront/collections/${encodeURIComponent(handle)}/products${qs ? `?${qs}` : ""}`);

  const res = await fetchBackendWithLog("fetchStorefrontCollectionProducts", url);

  if (!res.ok) {
    throw new Response("Failed to load collection products", { status: res.status });
  }

  const data: StorefrontListingResponse = await res.json();

  return {
    ...data,
    items: data.items.map((item) => ({
      ...item,
      thumbnail: backendAssetUrl(item.thumbnail) || null,
    })),
  };
}

export type StorefrontOrderRequest = {
  locale?: 'vi' | 'en';
  customer: {
    name: string;
    phone: string;
    email?: string;
  };
  shipping: {
    primaryAddress: {
      line1: string;
      line2?: string;
      city: string;
      province?: string;
      postalCode?: string;
      country: string;
    };
    shipToDifferentAddress: boolean;
    differentAddress?: {
      recipientName: string;
      recipientPhone: string;
      address: {
        line1: string;
        line2?: string;
        city: string;
        province?: string;
        postalCode?: string;
        country: string;
      };
    };
  };
  items: Array<{
    productId: number;
    variantId: number;
    quantity: number;
    customization?: {
      values: Record<string, unknown>;
    };
  }>;
};

export type StorefrontOrderResponse = {
  order: {
    id: number;
    orderNumber: string;
    status: string;
    paymentStatus: string;
    fulfillmentStatus: string;
    totalAmount: number;
    currencyCode: string;
    itemCount: number;
    createdAt: string;
  };
};

export type StorefrontResolvedCartLine = {
  productId: number;
  variantId: number;
  valid: boolean;
  reason: "product_unavailable" | "variant_missing" | "variant_mismatch" | "contact_price" | null;
  product?: {
    title: LocalizedTextValue;
    handle: string;
    variantTitle: LocalizedTextValue;
    sku: string | null;
    thumbnail: string | null;
    priceAmount: number | null;
    customizable: boolean;
    requiresCustomization: boolean;
    isContactPrice: boolean;
  };
};

export type StorefrontResolvedCartResponse = {
  items: StorefrontResolvedCartLine[];
};

export type StorefrontOrderLookupResponse = {
  order: {
    orderNumber: string;
    status: string;
    paymentStatus: string;
    fulfillmentStatus: string;
    totalAmount: number;
    currencyCode: string;
    itemCount: number;
    createdAt: string;
    customer: {
      name: string;
      phoneMasked: string;
      email: string | null;
    };
    primaryAddress: {
      line1: string;
      line2?: string;
      city: string;
      province?: string;
      postalCode?: string;
      country: string;
    } | null;
    shippingAddress: {
      recipientName: string;
      recipientPhone: string;
      address: {
        line1: string;
        line2?: string;
        city: string;
        province?: string;
        postalCode?: string;
        country: string;
      };
    } | null;
    items: Array<{
      quantity: number;
      unitPriceAmount: number;
      lineSubtotalAmount: number;
      productTitle: string;
      productHandle: string | null;
      variantTitle: string;
      sku: string | null;
      customizationValues: Array<{
        fieldId: string;
        label: string;
        valueSummary: string;
      }>;
    }>;
  };
};

export async function createStorefrontOrder(
  payload: StorefrontOrderRequest
): Promise<StorefrontOrderResponse> {
  const url = backendUrl("/api/storefront/orders");

  const res = await fetchBackendWithLog("createStorefrontOrder", url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => null) as { error?: string } | null;
    if (errData?.error) {
      throw new Error(errData.error);
    }
    throw new Response("Failed to create order", { status: res.status });
  }

  return res.json();
}

export async function resolveStorefrontCartLines(
  payload: { items: Array<{ productId: number; variantId: number }>, locale?: string },
): Promise<StorefrontResolvedCartResponse> {
  const res = await fetchBackendWithLog("resolveStorefrontCartLines", backendUrl("/api/storefront/orders/resolve"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Response("Failed to resolve cart lines", { status: res.status });
  }

  const data: StorefrontResolvedCartResponse = await res.json();
  return {
    items: data.items.map((item) => ({
      ...item,
      product: item.product
        ? {
            ...item.product,
            thumbnail: backendAssetUrl(item.product.thumbnail) || null,
          }
        : undefined,
    })),
  };
}

export async function lookupStorefrontOrder(payload: {
  orderNumber: string;
  phone: string;
}): Promise<StorefrontOrderLookupResponse> {
  const res = await fetchBackendWithLog("lookupStorefrontOrder", backendUrl("/api/storefront/orders/lookup"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errData = (await res.json().catch(() => null)) as { error?: string } | null;
    if (errData?.error) {
      throw new Error(errData.error);
    }
    throw new Response("Failed to look up order", { status: res.status });
  }

  return res.json();
}
