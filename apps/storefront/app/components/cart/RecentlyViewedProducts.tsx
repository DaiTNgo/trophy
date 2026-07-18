import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ProductCard } from "../shared/ProductCard";
import type { RecentlyViewedProduct } from "../../lib/recently-viewed";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "../ui/carousel";

type RecentlyViewedProductsProps = {
  items: RecentlyViewedProduct[];
};

export function RecentlyViewedProducts({ items }: RecentlyViewedProductsProps) {
  const [api, setApi] = useState<CarouselApi>();
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

  useEffect(() => {
    if (!api) {
      return;
    }

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

  const scrollPrev = useCallback(() => {
    api?.scrollPrev();
  }, [api]);

  const scrollNext = useCallback(() => {
    api?.scrollNext();
  }, [api]);

  if (items.length === 0) {
    return null;
  }

  return (
    <section className="mt-10 border-t border-gray-100 py-16">
      <div className="relative mb-10 flex items-center justify-center">
        <h2 className="text-center font-heading text-[32px] uppercase leading-none tracking-[0.03em] text-brand-strong">
          Sản phẩm đã xem gần đây
        </h2>

        <div className="absolute right-0 hidden items-center gap-3 text-text-muted md:flex">
          <button
            type="button"
            aria-label="Previous recently viewed products"
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
            aria-label="Next recently viewed products"
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
          <CarouselContent className="-ml-4">
            {items.map((item) => (
              <CarouselItem
                key={`${item.productId}-${item.handle}`}
                className="basis-1/2 pl-4 lg:basis-1/4"
              >
                <ProductCard
                  handle={item.handle}
                  title={item.title}
                  thumbnail={item.thumbnail}
                  imageAlt={item.title}
                  priceAmount={item.priceAmount}
                  variant="listing"
                />
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>

        <div className="absolute inset-y-0 left-0 flex items-center md:hidden">
          <button
            type="button"
            aria-label="Previous recently viewed products"
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
            aria-label="Next recently viewed products"
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
