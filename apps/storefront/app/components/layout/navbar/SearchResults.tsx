import { Link } from "react-router";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SearchResults as SearchResultsType } from "@/hooks/useSearch";
import type { MockProduct, MockCategory } from "@/hooks/useSearch";
import { getCategoryPath, getGenericProductPath } from "@/lib/storefront-paths";
import { formatCurrency } from "@/lib/utils";

interface SearchResultsProps {
  results: SearchResultsType | null;
  loading: boolean;
  query: string;
  onResultClick?: () => void;
}

function ProductResult({ product }: { product: MockProduct }) {
  return (
    <Link
      to={getGenericProductPath(product.handle)}
      className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors rounded-md"
    >
      <div className="w-10 h-10 rounded-md bg-gray-100 flex items-center justify-center shrink-0 overflow-hidden">
        {product.thumbnail ? (
          <img src={product.thumbnail} alt={product.title} className="w-full h-full object-cover" />
        ) : (
          <Search className="w-4 h-4 text-gray-400" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-gray-900 truncate">{product.title}</p>
        <p className="text-xs text-gray-500">
          {product.priceFrom ? "Từ " : ""}
          {formatCurrency(product.priceAmount)}
        </p>
      </div>
    </Link>
  );
}

function CategoryResult({ category }: { category: MockCategory }) {
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

function Column({
  title,
  items,
  renderItem,
}: {
  title: string;
  items: MockProduct[] | MockCategory[];
  renderItem: (item: MockProduct | MockCategory) => React.ReactNode;
}) {
  return (
    <div>
      <SectionHeader title={title} />
      <div className="space-y-0.5">
        {items.map((item) => (
          <div key={item.id}>{renderItem(item)}</div>
        ))}
      </div>
    </div>
  );
}

export function SearchResults({ results, loading, query, onResultClick }: SearchResultsProps) {
  if (!query.trim()) return null;

  if (loading) {
    return <LoadingSkeleton />;
  }

  if (!results || (results.products.length === 0 && results.categories.length === 0)) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Search className="w-8 h-8 text-gray-300 mb-3" />
        <p className="text-sm text-gray-500">Không có sản phẩm nào.</p>
      </div>
    );
  }

  const hasProducts = results.products.length > 0;
  const hasCategories = results.categories.length > 0;
  const bothTypes = hasProducts && hasCategories;

  return (
    <div onClick={onResultClick} className="pt-3">
      {bothTypes ? (
        <div className="grid grid-cols-2">
          <Column
            title="Danh mục"
            items={results.categories}
            renderItem={(item) => <CategoryResult category={item as MockCategory} />}
          />
          <Column
            title="Sản phẩm"
            items={results.products}
            renderItem={(item) => <ProductResult product={item as MockProduct} />}
          />
        </div>
      ) : hasCategories ? (
        <Column
          title="Danh mục"
          items={results.categories}
          renderItem={(item) => <CategoryResult category={item as MockCategory} />}
        />
      ) : (
        <Column
          title="Sản phẩm"
          items={results.products}
          renderItem={(item) => <ProductResult product={item as MockProduct} />}
        />
      )}
    </div>
  );
}
