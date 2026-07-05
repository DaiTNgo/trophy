import { Link } from "react-router";
import { ProductCard } from "../shared/ProductCard";
import type { StorefrontProductItem } from "../../lib/api";
import { backendAssetUrl } from "../../lib/api";
import { ArrowRight } from "lucide-react";

interface BestSellersSectionProps {
  products: StorefrontProductItem[];
}

export function BestSellersSection({ products }: BestSellersSectionProps) {
  if (products.length === 0) return null;

  // Cap at 8 per spec
  const displayProducts = products.slice(0, 8);

  return (
    <section className="py-24 px-4 md:px-margin-desktop bg-white">
      <div className="max-w-container-max mx-auto">
        {/* Header row */}
        <div className="flex flex-col md:flex-row justify-between items-end mb-14 reveal active">
          <div>
            <p className="font-label-md text-label-md uppercase tracking-[0.35em] text-[#875200] mb-3">
              Bán chạy
            </p>
            <h2 className="font-heading text-[36px] md:text-[44px] uppercase leading-none text-on-surface">
              Sản phẩm được chọn nhiều nhất
            </h2>
          </div>
          <Link
            className="hidden md:inline-flex items-center gap-1.5 font-label-md text-label-md text-[#875200] uppercase tracking-widest border-b-2 border-[#875200] pb-1 hover:text-[#fea00c] hover:border-[#fea00c] transition-colors"
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
              />
            );
          })}
        </div>

        {/* Mobile "view all" */}
        <div className="mt-12 text-center md:hidden">
          <Link
            to="/products"
            className="inline-flex items-center gap-2 border-2 border-[#875200] text-[#875200] font-label-md text-label-md uppercase px-10 py-4 rounded-lg tracking-widest hover:bg-[#875200] hover:text-white transition-all duration-300"
          >
            Xem tất cả sản phẩm
          </Link>
        </div>
      </div>
    </section>
  );
}
