import { useTranslation } from "react-i18next";
import type { StorefrontProductItem } from "../../lib/api";
import { getLocalized } from "../../lib/translation";
import { ProductCard } from "../shared/ProductCard";
import { ProductCarouselSection } from "../shared/ProductCarouselSection";

type SuggestedProductsSectionProps = {
  products: StorefrontProductItem[];
  locale?: string;
};

export function SuggestedProductsSection({
  products,
  locale = "vi",
}: SuggestedProductsSectionProps) {
  const { t } = useTranslation("layout");

  return (
    <ProductCarouselSection
      title={t("suggested_products_title")}
      prevLabel={t("suggested_products_previous")}
      nextLabel={t("suggested_products_next")}
      items={products}
      getKey={(item) => item.id}
      className="py-10 md:py-12"
      headerClassName="mb-8"
      titleClassName="text-[28px] md:text-[32px]"
      renderItem={(item) => (
        <ProductCard
          handle={item.handle}
          title={getLocalized(item.title, locale)}
          thumbnail={item.thumbnail}
          hoverImage={item.hoverImage}
          imageAlt={getLocalized(item.title, locale)}
          priceAmount={item.priceAmount}
          priceFrom={item.priceFrom}
          categorySummary={getLocalized(item.categorySummary, locale)}
          variant="listing"
          from="home"
        />
      )}
    />
  );
}
