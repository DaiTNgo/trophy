import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router";
import { toast } from "@medusajs/ui";
import { fetchProduct, mapApiProductToCatalogProduct } from "../../lib/products-client";
import type { CatalogProduct } from "../../types";

export function useProductDetail() {
  const { productId } = useParams();
  const [product, setProduct] = useState<CatalogProduct | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadProduct = useCallback(async () => {
    if (!productId) return;
    try {
      setError(null);
      const apiProduct = await fetchProduct(productId);
      setProduct(mapApiProductToCatalogProduct(apiProduct));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to load product.";
      setError(message);
      toast.error("Product could not be loaded", {
        description: `${message} Return to Products and try opening the product again.`,
      });
    } finally {
      setIsLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    void loadProduct();
  }, [loadProduct]);

  return {
    product,
    isLoading,
    error,
    mutate: loadProduct,
  };
}
