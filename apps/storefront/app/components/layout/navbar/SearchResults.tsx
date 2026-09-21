import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { Search, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SearchResults as SearchResultsType } from "@/hooks/useSearch";
import type {
  SearchProduct,
  SearchCategory,
  SearchCollection,
} from "@/hooks/useSearch";
import {
  getCategoryPath,
  getCollectionPath,
  getProductPath,
} from "@/lib/storefront-paths";
import { formatCurrency } from "@/lib/utils";

interface SearchResultsProps {
  results: SearchResultsType | null;
  loading: boolean;
  query: string;
  onResultClick?: () => void;
}

function ProductResult({ product }: { product: SearchProduct }) {
  const { t } = useTranslation("layout");

  return (
    <Link
      to={getProductPath({ productHandle: product.handle, from: "home" })}
      className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors rounded-md"
    >
      <div className="w-10 h-10 rounded-md bg-gray-100 flex items-center justify-center shrink-0 overflow-hidden">
        {product.thumbnail ? (
          <img
            src={product.thumbnail}
            alt={product.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <Search className="w-4 h-4 text-gray-400" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-gray-900 truncate">
          {product.title}
        </p>
        <p className="text-xs text-gray-500">
          {product.priceFrom ? t("search_price_from") : ""}
          {formatCurrency(product.priceAmount)}
        </p>
      </div>
    </Link>
  );
}

function CategoryResult({ category }: { category: SearchCategory }) {
  return (
    <Link
      to={getCategoryPath(category.handle)}
      className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors rounded-md"
    >
      <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
        <Search className="w-4 h-4 text-primary" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-gray-900">{category.name}</p>
      </div>
    </Link>
  );
}

function CollectionResult({ collection }: { collection: SearchCollection }) {
  return (
    <Link
      to={getCollectionPath(collection.handle)}
      className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors rounded-md"
    >
      <div className="w-10 h-10 rounded-md bg-amber-500/10 flex items-center justify-center shrink-0">
        <Sparkles className="w-4 h-4 text-amber-600" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-gray-900">{collection.title}</p>
      </div>
    </Link>
  );
}

function LoadingSkeleton() {
  return (
    <div className="p-4 space-y-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 animate-pulse">
          <div className="w-10 h-10 rounded-md bg-gray-200" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3.5 bg-gray-200 rounded w-3/4" />
            <div className="h-3 bg-gray-100 rounded w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <p className="px-4 pb-3 mb-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center border-b border-gray-100">
      {title}
    </p>
  );
}

export function SearchResults({
  results,
  loading,
  query,
  onResultClick,
}: SearchResultsProps) {
  const { t } = useTranslation("layout");

  if (!query.trim()) return null;

  if (loading) {
    return <LoadingSkeleton />;
  }

  const collections = results?.collections ?? [];
  const categories = results?.categories ?? [];
  const products = results?.products ?? [];

  if (
    !results ||
    (products.length === 0 && categories.length === 0 && collections.length === 0)
  ) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Search className="w-8 h-8 text-gray-300 mb-3" />
        <p className="text-sm text-gray-500">{t("search_no_results")}</p>
      </div>
    );
  }

  const hasProducts = products.length > 0;
  const hasTaxonomies = categories.length > 0 || collections.length > 0;

  return (
    <div onClick={onResultClick} className="pt-3">
      {hasProducts && hasTaxonomies ? (
        <div className="grid grid-cols-2 divide-x divide-gray-100">
          <div className="space-y-4">
            {categories.length > 0 && (
              <div>
                <SectionHeader title={t("search_category")} />
                <div className="space-y-0.5">
                  {categories.map((item) => (
                    <CategoryResult key={item.id} category={item} />
                  ))}
                </div>
              </div>
            )}
            {collections.length > 0 && (
              <div>
                <SectionHeader title={t("search_collection")} />
                <div className="space-y-0.5">
                  {collections.map((item) => (
                    <CollectionResult key={item.id} collection={item} />
                  ))}
                </div>
              </div>
            )}
          </div>
          <div>
            <SectionHeader title={t("search_product")} />
            <div className="space-y-0.5">
              {products.map((item) => (
                <ProductResult key={item.id} product={item} />
              ))}
            </div>
          </div>
        </div>
      ) : hasTaxonomies ? (
        categories.length > 0 && collections.length > 0 ? (
          <div className="grid grid-cols-2 divide-x divide-gray-100">
            <div>
              <SectionHeader title={t("search_category")} />
              <div className="space-y-0.5">
                {categories.map((item) => (
                  <CategoryResult key={item.id} category={item} />
                ))}
              </div>
            </div>
            <div>
              <SectionHeader title={t("search_collection")} />
              <div className="space-y-0.5">
                {collections.map((item) => (
                  <CollectionResult key={item.id} collection={item} />
                ))}
              </div>
            </div>
          </div>
        ) : categories.length > 0 ? (
          <div>
            <SectionHeader title={t("search_category")} />
            <div className="space-y-0.5">
              {categories.map((item) => (
                <CategoryResult key={item.id} category={item} />
              ))}
            </div>
          </div>
        ) : (
          <div>
            <SectionHeader title={t("search_collection")} />
            <div className="space-y-0.5">
              {collections.map((item) => (
                <CollectionResult key={item.id} collection={item} />
              ))}
            </div>
          </div>
        )
      ) : (
        <div>
          <SectionHeader title={t("search_product")} />
          <div className="space-y-0.5">
            {products.map((item) => (
              <ProductResult key={item.id} product={item} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
