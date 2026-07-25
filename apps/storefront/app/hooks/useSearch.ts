import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "react-router";
import { fetchStorefrontCategories, fetchStorefrontProducts } from "@/lib/api";
import { getLocalized } from "@/lib/translation";

export interface SearchProduct {
  id: number;
  title: string;
  handle: string;
  thumbnail: string | null;
  priceAmount: number | null;
  priceFrom: boolean;
}

export interface SearchCategory {
  id: number;
  name: string;
  handle: string;
}

export interface SearchResults {
  products: SearchProduct[];
  categories: SearchCategory[];
}

export function useSearch() {
  const [searchParams] = useSearchParams();
  const locale = searchParams.get("locale") === "en" ? "en" : "vi";
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const clear = useCallback(() => {
    setQuery("");
    setResults(null);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      setResults(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const q = query.trim();
    let active = true;

    timerRef.current = setTimeout(() => {
      void Promise.all([
        fetchStorefrontProducts({ q, limit: 8, locale }),
        fetchStorefrontCategories(locale),
      ])
        .then(([productResponse, categoryResponse]) => {
          if (!active) return;

          const normalizedQuery = q.toLocaleLowerCase(locale);
          const matchedCategories = categoryResponse
            .filter((category) => {
              const name = getLocalized(category.name, locale).toLocaleLowerCase(locale);
              return name.includes(normalizedQuery) || category.handle.toLowerCase().includes(normalizedQuery);
            })
            .slice(0, 8)
            .map((category) => ({
              id: category.id,
              name: getLocalized(category.name, locale),
              handle: category.handle,
            }));

          setResults({
            products: productResponse.items.map((product) => ({
              id: product.id,
              title: getLocalized(product.title, locale),
              handle: product.handle,
              thumbnail: product.thumbnail,
              priceAmount: product.priceAmount,
              priceFrom: product.priceFrom,
            })),
            categories: matchedCategories,
          });
          setLoading(false);
        })
        .catch(() => {
          if (!active) return;
          setResults({ products: [], categories: [] });
          setLoading(false);
        });
    }, 400);

    return () => {
      active = false;
      clearTimeout(timerRef.current);
    };
  }, [query, locale]);

  return { query, setQuery, results, loading, clear };
}
