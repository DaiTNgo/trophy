import { Link } from "react-router";
import { ProductCard } from "../shared/ProductCard";
import type { StorefrontProductItem } from "../../lib/api";

interface BestSellersSectionProps {
  products: StorefrontProductItem[];
}

export function BestSellersSection({ products }: BestSellersSectionProps) {
  if (products.length === 0) {
    return null;
  }

  return (
    <section className="py-32 px-margin-desktop bg-surface">
      <div className="max-w-container-max mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-end mb-16 reveal active">
          <div>
            <h2 className="font-headline-lg text-headline-lg uppercase mb-4">Sản Phẩm <span className="text-primary">Bán Chạy</span></h2>
            <p className="font-body-lg text-body-lg text-on-surface-variant">Những mẫu thiết kế được ưa chuộng nhất tại Phùng Thị</p>
          </div>
          <Link className="font-label-md text-label-md text-primary uppercase border-b-2 border-primary pb-1 hover:text-on-primary-container transition-colors hidden md:block" to="/products">Xem tất cả sản phẩm</Link>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-gutter">
          {products.map((product) => (
            <ProductCard key={product.id} {...product} />
          ))}
        </div>
        
        <div className="mt-12 text-center md:hidden">
          <Link to="/products" className="border-2 border-primary text-primary font-label-md text-label-md uppercase px-10 py-4 rounded-full tracking-widest hover:bg-primary-fixed transition-all duration-300 inline-block">
            Xem tất cả sản phẩm
          </Link>
        </div>
      </div>
    </section>
  );
}
