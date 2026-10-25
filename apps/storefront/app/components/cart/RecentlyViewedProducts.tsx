import { useTranslation } from "react-i18next";
import { ProductCard } from "../shared/ProductCard";
import { ProductCarouselSection } from "../shared/ProductCarouselSection";
import type { RecentlyViewedProduct } from "../../lib/recently-viewed";

type RecentlyViewedProductsProps = {
  items: RecentlyViewedProduct[];
};

export function RecentlyViewedProducts({ items }: RecentlyViewedProductsProps) {
  const { t } = useTranslation("cart");

  return (
    <ProductCarouselSection
      title={t("recently_viewed_title")}
      prevLabel={t("recently_viewed_prev")}
      nextLabel={t("recently_viewed_next")}
      items={items}
      getKey={(item) => `${item.productId}-${item.handle}`}
      className="py-16"
      headerClassName="mb-10"
      titleClassName="text-[32px]"
      renderItem={(item) => (
        <ProductCard
          handle={item.handle}
          title={item.title}
          thumbnail={item.thumbnail}
          hoverImage={item.hoverImage}
          imageAlt={item.title}
          priceAmount={item.priceAmount}
          variant="listing"
          from="home"
        />
      )}
    />
  );
}
