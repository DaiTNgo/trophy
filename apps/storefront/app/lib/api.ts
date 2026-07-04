const BACKEND_URL =
  (import.meta.env.VITE_BACKEND_URL as string | undefined)?.replace(/\/$/, "") ??
  "http://localhost:8787";

export function backendAssetUrl(path: string | null | undefined) {
  if (!path) return "";
  if (/^https?:\/\//i.test(path)) return path;
  return `${BACKEND_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

export type StorefrontProductItem = {
  id: number;
  title: string;
  subtitle: string | null;
  handle: string;
  priceAmount: number | null;
  priceFrom: boolean;
  thumbnail: string | null;
  categorySummary: string | null;
  typeValue: string | null;
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
    title: string;
    subtitle: string | null;
    handle: string;
    description: string | null;
    hasVariants: boolean;
    type: { id: number; value: string } | null;
    categories: Array<{ id: number; name: string; handle: string; parentId: number | null }>;
    attributes: Array<{ id: number; productId: number; name: string; value: string; unit: string | null; position: number }>;
    options: Array<{ id: number; productId: number; title: string; position: number; values: Array<{ id: number; optionId: number; value: string; position: number }> }>;
    variants: Array<{
      id: number;
      title: string;
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
      optionValues: Array<{ id: number; value: string; optionId: number; optionTitle: string | null }>;
    }>;
    customization: {
      enabled: boolean;
      canvasWidthPx: number | null;
      canvasHeightPx: number | null;
      layers: unknown[];
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
}): Promise<StorefrontListingResponse> {
  const searchParams = new URLSearchParams();
  if (params.q) searchParams.set("q", params.q);
  if (params.category) searchParams.set("category", params.category);
  if (params.page) searchParams.set("page", String(params.page));
  if (params.limit) searchParams.set("limit", String(params.limit));

  const qs = searchParams.toString();
  const url = `${BACKEND_URL}/api/storefront/products${qs ? `?${qs}` : ""}`;

  const res = await fetch(url);

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

export async function fetchStorefrontProduct(handle: string): Promise<StorefrontDetailResponse["item"]> {
  const url = `${BACKEND_URL}/api/storefront/products/${encodeURIComponent(handle)}`;

  const res = await fetch(url);

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
  const res = await fetch(`${BACKEND_URL}/api/storefront/brand-assets/fonts`);

  if (!res.ok) {
    throw new Response("Failed to load fonts", { status: res.status });
  }

  const data = (await res.json()) as { fonts?: StorefrontDynamicFont[] };
  return data.fonts ?? [];
}

export type StorefrontCategory = {
  id: number;
  name: string;
  handle: string;
  description: string | null;
  imageUrl: string | null;
  parentId: number | null;
};

export async function fetchStorefrontCategories(): Promise<StorefrontCategory[]> {
  const res = await fetch(`${BACKEND_URL}/api/storefront/categories`);

  if (!res.ok) {
    throw new Response("Failed to load categories", { status: res.status });
  }

  const data = (await res.json()) as { items: StorefrontCategory[] };
  return data.items;
}

export async function fetchStorefrontCollectionProducts(
  handle: string,
  params?: { page?: number; limit?: number }
): Promise<StorefrontListingResponse> {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set("page", String(params.page));
  if (params?.limit) searchParams.set("limit", String(params.limit));

  const qs = searchParams.toString();
  const url = `${BACKEND_URL}/api/storefront/collections/${encodeURIComponent(handle)}/products${qs ? `?${qs}` : ""}`;

  const res = await fetch(url);

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
