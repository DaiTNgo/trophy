import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { CatalogContextValue, CatalogProduct } from "../types";
import { initialProducts, CATALOG_STORAGE_KEY } from "../lib/mock-data";

const catalogContext = createContext<CatalogContextValue | null>(null);

export function CatalogProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<CatalogProduct[]>(initialProducts);

  useEffect(() => {
    const saved = window.localStorage.getItem(CATALOG_STORAGE_KEY);
    if (!saved) {
      return;
    }

    try {
      setProducts(JSON.parse(saved) as CatalogProduct[]);
    } catch {
      window.localStorage.removeItem(CATALOG_STORAGE_KEY);
    }
  }, []);

  const value = useMemo<CatalogContextValue>(
    () => ({
      products,
      createProduct: (product) => {
        const nextProduct = product;
        const nextProducts = [nextProduct, ...products.filter((entry) => entry.id !== nextProduct.id)];
        setProducts(nextProducts);
        window.localStorage.setItem(CATALOG_STORAGE_KEY, JSON.stringify(nextProducts));
        return nextProduct;
      },
      updateProduct: (productId, updater) => {
        const currentProduct = products.find((product) => product.id === productId);
        if (!currentProduct) {
          return null;
        }

        const updatedProduct = updater(currentProduct);
        const nextProducts = products.map((product) => (product.id === productId ? updatedProduct : product));
        setProducts(nextProducts);
        window.localStorage.setItem(CATALOG_STORAGE_KEY, JSON.stringify(nextProducts));
        return updatedProduct;
      },
    }),
    [products],
  );

  return <catalogContext.Provider value={value}>{children}</catalogContext.Provider>;
}

export function useCatalog() {
  const context = useContext(catalogContext);
  if (!context) {
    throw new Error("useCatalog must be used within CatalogProvider.");
  }

  return context;
}
