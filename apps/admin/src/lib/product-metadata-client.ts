import { backendFetch } from "./fetch";

export type ProductMetadataItem = {
  id: number;
  label: string;
};

export type ProductMetadataSnapshot = {
  types: ProductMetadataItem[];
  collections: ProductMetadataItem[];
  categories: ProductMetadataItem[];
  tags: ProductMetadataItem[];
};

type TypesResponse = { items?: Array<{ id: number; value: string }> };
type CollectionsResponse = { items?: Array<{ id: number; title: string }> };
type CategoriesResponse = { items?: Array<{ id: number; name: string }> };
type TagsResponse = { items?: Array<{ id: number; value: string }> };

export async function fetchProductMetadata(): Promise<ProductMetadataSnapshot> {
  const [typesRes, collectionsRes, categoriesRes, tagsRes] = await Promise.all([
    backendFetch("/api/admin/product-metadata/types"),
    backendFetch("/api/admin/product-metadata/collections"),
    backendFetch("/api/admin/product-metadata/categories"),
    backendFetch("/api/admin/product-metadata/tags"),
  ]);

  if (!typesRes.ok || !collectionsRes.ok || !categoriesRes.ok || !tagsRes.ok) {
    throw new Error("Unable to load product metadata.");
  }

  const [typesBody, collectionsBody, categoriesBody, tagsBody] = (await Promise.all([
    typesRes.json(),
    collectionsRes.json(),
    categoriesRes.json(),
    tagsRes.json(),
  ])) as [TypesResponse, CollectionsResponse, CategoriesResponse, TagsResponse];

  return {
    types: (typesBody.items ?? []).map((item) => ({ id: item.id, label: item.value })),
    collections: (collectionsBody.items ?? []).map((item) => ({ id: item.id, label: item.title })),
    categories: (categoriesBody.items ?? []).map((item) => ({ id: item.id, label: item.name })),
    tags: (tagsBody.items ?? []).map((item) => ({ id: item.id, label: item.value })),
  };
}
