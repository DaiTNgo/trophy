export function getCategoryPath(categoryHandle: string) {
  return `/categories/${encodeURIComponent(categoryHandle)}`;
}

export function getCollectionPath(collectionHandle: string) {
  return `/collections/${encodeURIComponent(collectionHandle)}`;
}

export function getGenericProductPath(productHandle: string) {
  return `/product/${encodeURIComponent(productHandle)}`;
}

export function getCategoryProductPath(
  categoryHandle: string,
  productHandle: string,
) {
  return `${getCategoryPath(categoryHandle)}/products/${encodeURIComponent(productHandle)}`;
}

export function getCategoryProductRedirectPath(
  _categoryHandle: string,
  productHandle: string,
  search = "",
) {
  return `${getGenericProductPath(productHandle)}${search}`;
}

export function getProductPath({
  productHandle,
  categoryHandle,
  collectionHandle,
  sourceContext,
}: {
  productHandle: string;
  categoryHandle?: string | null;
  collectionHandle?: string | null;
  sourceContext?: "category" | "collection";
}) {
  const params = new URLSearchParams();
  if (sourceContext === "collection") {
    if (collectionHandle) params.set("collection", collectionHandle);
    if (categoryHandle) params.set("category", categoryHandle);
  } else {
    if (categoryHandle) params.set("category", categoryHandle);
    if (collectionHandle) params.set("collection", collectionHandle);
  }
  const qs = params.toString();
  return `${getGenericProductPath(productHandle)}${qs ? `?${qs}` : ""}`;
}

export function getActiveCategoryHandle(pathname: string) {
  const match = pathname.match(/^\/categories\/([^/]+)(?:\/products\/[^/]+)?\/?$/);
  return match ? decodeURIComponent(match[1]) : null;
}
