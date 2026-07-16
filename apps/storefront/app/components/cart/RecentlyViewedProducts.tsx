import { ProductCard } from "../shared/ProductCard";
import type { RecentlyViewedProduct } from "../../lib/recently-viewed";

type RecentlyViewedProductsProps = {
  items: RecentlyViewedProduct[];
};

export function RecentlyViewedProducts({ items }: RecentlyViewedProductsProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <section className="mt-10 border-t border-gray-100 py-16">
      <h2 className="mb-10 text-center font-heading text-[32px] uppercase leading-none tracking-[0.03em] text-brand-strong">
        Sản phẩm đã xem gần đây
      </h2>
      <div className="grid gap-x-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((item) => (
          <ProductCard
            key={`${item.productId}-${item.handle}`}
            handle={item.handle}
            title={item.title}
            thumbnail={item.thumbnail}
            imageAlt={item.title}
            priceAmount={item.priceAmount}
            variant="listing"
          />
        ))}
      </div>
    </section>
  );
}
