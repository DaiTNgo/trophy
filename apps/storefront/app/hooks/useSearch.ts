import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "react-router";
import {
  fetchStorefrontCategories,
  fetchStorefrontCollections,
  fetchStorefrontProducts,
} from "@/lib/api";
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

export interface SearchCollection {
  id: number;
  title: string;
  handle: string;
  imageUrl?: string | null;
}

export interface SearchResults {
  products: SearchProduct[];
  categories: SearchCategory[];
  collections: SearchCollection[];
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
        fetchStorefrontCategories(locale).catch(() => []),
        fetchStorefrontCollections(locale).catch(() => []),
      ])
        .then(([productResponse, categoryResponse, collectionResponse]) => {
          if (!active) return;

          const normalizedQuery = q.toLocaleLowerCase(locale);
          const matchedCategories = categoryResponse
            .filter((category) => {
              const name = getLocalized(category.name, locale).toLocaleLowerCase(locale);
              return (
                name.includes(normalizedQuery) ||
                category.handle.toLowerCase().includes(normalizedQuery)
              );
            })
            .slice(0, 8)
            .map((category) => ({
              id: category.id,
              name: getLocalized(category.name, locale),
              handle: category.handle,
            }));

          const matchedCollections = collectionResponse
            .filter((collection) => {
              const title = getLocalized(collection.title, locale).toLocaleLowerCase(locale);
              return (
                title.includes(normalizedQuery) ||
                collection.handle.toLowerCase().includes(normalizedQuery)
              );
            })
            .slice(0, 8)
            .map((collection) => ({
              id: collection.id,
              title: getLocalized(collection.title, locale),
              handle: collection.handle,
              imageUrl: collection.imageUrl,
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
            collections: matchedCollections,
          });
          setLoading(false);
        })
        .catch(() => {
          if (!active) return;
          setResults({ products: [], categories: [], collections: [] });
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
