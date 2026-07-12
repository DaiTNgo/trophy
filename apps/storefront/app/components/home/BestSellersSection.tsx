import { Link } from "react-router";
import { ProductCard } from "../shared/ProductCard";
import type { StorefrontProductItem } from "../../lib/api";
import { backendAssetUrl } from "../../lib/api";
import { ArrowRight } from "lucide-react";
import { getLocalized } from "../../lib/translation";

interface BestSellersSectionProps {
  products: StorefrontProductItem[];
  locale?: string;
}

export function BestSellersSection({ products, locale = "vi" }: BestSellersSectionProps) {
  if (products.length === 0) return null;

  // Cap at 8 per spec
  const displayProducts = products.slice(0, 8);

  return (
    <section className="py-24 px-4 md:px-margin-desktop bg-white">
      <div className="max-w-container-max mx-auto">
        {/* Header row */}
        <div className="flex flex-col md:flex-row justify-between items-end mb-14 reveal active">
          <div>
            <p className="mb-3 font-label-md text-label-md uppercase tracking-[0.35em] text-brand-accent">
              Bán chạy
            </p>
            <h2 className="font-heading text-[36px] md:text-[44px] uppercase leading-none text-on-surface">
              Sản phẩm được chọn nhiều nhất
            </h2>
          </div>
          <Link
            className="hidden items-center gap-1.5 border-b-2 border-brand-strong pb-1 font-label-md text-label-md uppercase tracking-widest text-brand-strong transition-colors hover:border-brand-support hover:text-brand-support md:inline-flex"
            to="/products"
          >
            Xem tất cả
            <ArrowRight className="text-[16px]" />
          </Link>
        </div>

        {/* Product grid: 2-col mobile → 4-col desktop */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-10">
          {displayProducts.map((product) => {
            const imgSrc = product.thumbnail
              ? backendAssetUrl(product.thumbnail)
              : undefined;
            return (
              <ProductCard
                key={product.id}
                {...product}
                thumbnail={imgSrc}
                title={getLocalized(product.title, locale)}
                subtitle={getLocalized(product.subtitle, locale) || null}
                categorySummary={getLocalized(product.categorySummary, locale) || null}
                imageAlt={getLocalized(product.title, locale)}
              />
            );
          })}
        </div>

        {/* Mobile "view all" */}
        <div className="mt-12 text-center md:hidden">
          <Link
            to="/products"
            className="inline-flex items-center gap-2 rounded-lg border-2 border-brand-strong px-10 py-4 font-label-md text-label-md uppercase tracking-widest text-brand-strong transition-all duration-300 hover:bg-brand-strong hover:text-white"
          >
            Xem tất cả sản phẩm
          </Link>
        </div>
      </div>
    </section>
  );
}
