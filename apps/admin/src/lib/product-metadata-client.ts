import { backendFetch } from "./fetch";

export type ProductMetadataItem = {
  id: number;
  label: string;
};

export type ProductMetadataSnapshot = {
  collections: ProductMetadataItem[];
  categories: ProductMetadataItem[];
};

type CollectionsResponse = { items?: Array<{ id: number; title: string }> };
type CategoriesResponse = { items?: Array<{ id: number; name: string }> };

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
    collections: (collectionsBody.items ?? []).map((item) => ({ id: item.id, label: item.title })),
    categories: (categoriesBody.items ?? []).map((item) => ({ id: item.id, label: item.name })),
  };
}
