export const RECENTLY_VIEWED_STORAGE_KEY = "trophy:recently-viewed-products";
export const MAX_RECENTLY_VIEWED_PRODUCTS = 8;

export type RecentlyViewedProduct = {
  productId: number;
  handle: string;
  title: string;
  thumbnail: string | null;
  priceAmount: number | null;
  viewedAt: string;
};

type StorageLike = Pick<Storage, "getItem" | "setItem">;

function getBrowserStorage(): StorageLike | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function isRecentlyViewedProduct(value: unknown): value is RecentlyViewedProduct {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.productId === "number" &&
    Number.isFinite(candidate.productId) &&
    typeof candidate.handle === "string" &&
    candidate.handle.length > 0 &&
    typeof candidate.title === "string" &&
    candidate.title.length > 0 &&
    (typeof candidate.thumbnail === "string" || candidate.thumbnail === null) &&
    (typeof candidate.priceAmount === "number" || candidate.priceAmount === null) &&
    typeof candidate.viewedAt === "string" &&
    candidate.viewedAt.length > 0
  );
}

export function parseRecentlyViewedProducts(raw: string | null): RecentlyViewedProduct[] {
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(isRecentlyViewedProduct);
  } catch {
    return [];
  }
}

export function upsertRecentlyViewedProduct(
  current: RecentlyViewedProduct[],
  nextProduct: Omit<RecentlyViewedProduct, "viewedAt"> & { viewedAt?: string },
): RecentlyViewedProduct[] {
  const nextEntry: RecentlyViewedProduct = {
    ...nextProduct,
    viewedAt: nextProduct.viewedAt ?? new Date().toISOString(),
  };

  return [
    nextEntry,
    ...current.filter(
      (item) =>
        item.productId !== nextEntry.productId &&
        item.handle !== nextEntry.handle,
    ),
  ].slice(0, MAX_RECENTLY_VIEWED_PRODUCTS);
}

export function getRecentlyViewedProducts(storage: StorageLike | null = getBrowserStorage()) {
  if (!storage) {
    return [];
  }

  return parseRecentlyViewedProducts(storage.getItem(RECENTLY_VIEWED_STORAGE_KEY));
}

export function recordRecentlyViewedProduct(
  product: Omit<RecentlyViewedProduct, "viewedAt">,
  storage: StorageLike | null = getBrowserStorage(),
) {
  if (!storage) {
    return [];
  }

  try {
    const next = upsertRecentlyViewedProduct(getRecentlyViewedProducts(storage), product);
    storage.setItem(RECENTLY_VIEWED_STORAGE_KEY, JSON.stringify(next));
    return next;
  } catch {
    return [];
  }
}
