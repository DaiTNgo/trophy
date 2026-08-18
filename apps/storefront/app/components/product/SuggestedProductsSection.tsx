import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { StorefrontProductItem } from "../../lib/api";
import { getLocalized } from "../../lib/translation";
import { ProductCard } from "../shared/ProductCard";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "../ui/carousel";

type SuggestedProductsSectionProps = {
  products: StorefrontProductItem[];
  locale?: string;
};

export function SuggestedProductsSection({
  products,
  locale = "vi",
}: SuggestedProductsSectionProps) {
  const { t } = useTranslation("layout");
  const [api, setApi] = useState<CarouselApi>();
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

  useEffect(() => {
    if (!api) return;
    const updateScrollState = () => {
      setCanScrollPrev(api.canScrollPrev());
      setCanScrollNext(api.canScrollNext());
    };
    updateScrollState();
    api.on("select", updateScrollState);
    api.on("reInit", updateScrollState);
    return () => {
      api.off("select", updateScrollState);
      api.off("reInit", updateScrollState);
    };
  }, [api]);

  const scrollPrev = useCallback(() => api?.scrollPrev(), [api]);
  const scrollNext = useCallback(() => api?.scrollNext(), [api]);

  if (products.length === 0) return null;

  return (
    <section className="mt-10 border-t border-gray-100 py-10 md:py-12">
      <div className="relative mb-8 flex items-center justify-center">
        <h2 className="text-center font-heading text-[28px] uppercase leading-none tracking-[0.03em] text-brand-strong md:text-[32px]">
          {t("suggested_products_title")}
        </h2>

        <div className="absolute right-0 hidden items-center gap-3 text-text-muted md:flex">
          <button
            type="button"
            aria-label={t("suggested_products_previous")}
            className={`flex h-10 w-10 items-center justify-center transition-colors ${
              canScrollPrev
                ? "text-text-muted hover:text-brand-strong"
                : "cursor-not-allowed text-border-subtle"
            }`}
            disabled={!canScrollPrev}
            onClick={scrollPrev}
          >
            <ChevronLeft className="h-7 w-7 stroke-[1.5]" />
          </button>
          <button
            type="button"
            aria-label={t("suggested_products_next")}
            className={`flex h-10 w-10 items-center justify-center transition-colors ${
              canScrollNext
                ? "text-text-muted hover:text-brand-strong"
                : "cursor-not-allowed text-border-subtle"
            }`}
            disabled={!canScrollNext}
            onClick={scrollNext}
          >
            <ChevronRight className="h-7 w-7 stroke-[1.5]" />
          </button>
        </div>
      </div>

      <div className="relative">
        <Carousel
          setApi={setApi}
          opts={{ align: "start", dragFree: true }}
          className="w-full"
        >
          <CarouselContent className="ml-0 pt-4 pb-3">
            {products.map((item) => (
              <CarouselItem
                key={item.id}
                className="basis-1/2 px-2 lg:basis-1/4"
              >
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
                />
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>

        <div className="absolute inset-y-0 left-0 flex items-center md:hidden">
          <button
            type="button"
            aria-label={t("suggested_products_previous")}
            className={`z-10 -ml-3 flex h-8 w-8 items-center justify-center rounded-full border border-border-subtle bg-surface-base shadow-sm transition-opacity ${
              canScrollPrev ? "opacity-100" : "pointer-events-none opacity-0"
            }`}
            onClick={scrollPrev}
          >
            <ChevronLeft className="h-4 w-4 text-brand-strong" />
          </button>
        </div>
        <div className="absolute inset-y-0 right-0 flex items-center md:hidden">
          <button
            type="button"
            aria-label={t("suggested_products_next")}
            className={`z-10 -mr-3 flex h-8 w-8 items-center justify-center rounded-full border border-border-subtle bg-surface-base shadow-sm transition-opacity ${
              canScrollNext ? "opacity-100" : "pointer-events-none opacity-0"
            }`}
            onClick={scrollNext}
          >
            <ChevronRight className="h-4 w-4 text-brand-strong" />
          </button>
        </div>
      </div>
    </section>
  );
}
