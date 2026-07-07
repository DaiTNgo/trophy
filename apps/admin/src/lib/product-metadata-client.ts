import { backendFetch } from "./fetch";

type LocalizedLabel = { vi: string; en?: string | null };

export type ProductMetadataItem = {
  id: number;
  label: string;
};

export type ProductMetadataSnapshot = {
  collections: ProductMetadataItem[];
  categories: ProductMetadataItem[];
};

type CollectionsResponse = { items?: Array<{ id: number; title: LocalizedLabel }> };
type CategoriesResponse = { categories?: Array<{ id: number; name: LocalizedLabel }> };

const extractLabel = (v: string | LocalizedLabel): string =>
  typeof v === "string" ? v : (v.vi ?? "");

export async function fetchProductMetadata(): Promise<ProductMetadataSnapshot> {
  const [collectionsRes, categoriesRes] = await Promise.all([
    backendFetch("/api/admin/product-metadata/collections"),
    backendFetch("/api/admin/product-metadata/categories"),
  ]);

  if (!collectionsRes.ok || !categoriesRes.ok) {
    throw new Error("Unable to load product metadata.");
  }

  const [collectionsBody, categoriesBody] = (await Promise.all([
    collectionsRes.json(),
    categoriesRes.json(),
  ])) as [CollectionsResponse, CategoriesResponse];

  return {
    collections: (collectionsBody.items ?? []).map((item) => ({ id: item.id, label: extractLabel(item.title) })),
    categories: (categoriesBody.categories ?? []).map((item) => ({ id: item.id, label: extractLabel(item.name) })),
  };
}
