export function getCategoryPath(categoryHandle: string) {
  return `/categories/${encodeURIComponent(categoryHandle)}`;
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

export function getProductPath({
  productHandle,
  categoryHandle,
}: {
  productHandle: string;
  categoryHandle?: string | null;
}) {
  if (categoryHandle) {
    return getCategoryProductPath(categoryHandle, productHandle);
  }

  return getGenericProductPath(productHandle);
}

export function getActiveCategoryHandle(pathname: string) {
  const match = pathname.match(/^\/categories\/([^/]+)(?:\/products\/[^/]+)?\/?$/);
  return match ? decodeURIComponent(match[1]) : null;
}
