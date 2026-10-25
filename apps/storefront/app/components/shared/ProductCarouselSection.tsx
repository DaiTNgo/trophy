import { useCallback, useEffect, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "../../lib/utils";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "../ui/carousel";

type ProductCarouselSectionProps<T> = {
  title: string;
  prevLabel: string;
  nextLabel: string;
  items: T[];
  getKey: (item: T) => string | number;
  renderItem: (item: T) => ReactNode;
  className?: string;
  headerClassName?: string;
  titleClassName?: string;
};

/** Titled product carousel with arrow controls (desktop header arrows, mobile edge arrows). */
export function ProductCarouselSection<T>({
  title,
  prevLabel,
  nextLabel,
  items,
  getKey,
  renderItem,
  className,
  headerClassName,
  titleClassName,
}: ProductCarouselSectionProps<T>) {
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

  if (items.length === 0) return null;

  const desktopArrowClass = (enabled: boolean) =>
    cn(
      "flex h-10 w-10 items-center justify-center transition-colors",
      enabled
        ? "text-text-muted hover:text-brand-strong"
        : "cursor-not-allowed text-border-subtle",
    );
  const mobileArrowClass = (enabled: boolean) =>
    cn(
      "z-10 flex h-8 w-8 items-center justify-center rounded-full border border-border-subtle bg-surface-base shadow-sm transition-opacity",
      enabled ? "opacity-100" : "pointer-events-none opacity-0",
    );

  return (
    <section className={cn("mt-10 border-t border-gray-100", className)}>
      <div className={cn("relative flex items-center justify-center", headerClassName)}>
        {/* Plain concatenation: twMerge would drop leading-none next to a text-[size] class. */}
        <h2
          className={`text-center font-heading uppercase leading-none tracking-[0.03em] text-brand-strong ${titleClassName ?? ""}`}
        >
          {title}
        </h2>

        <div className="absolute right-0 hidden items-center gap-3 text-text-muted md:flex">
          <button
            type="button"
            aria-label={prevLabel}
            className={desktopArrowClass(canScrollPrev)}
            disabled={!canScrollPrev}
            onClick={scrollPrev}
          >
            <ChevronLeft className="h-7 w-7 stroke-[1.5]" />
          </button>
          <button
            type="button"
            aria-label={nextLabel}
            className={desktopArrowClass(canScrollNext)}
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
            {items.map((item) => (
              <CarouselItem key={getKey(item)} className="basis-1/2 px-2 lg:basis-1/4">
                {renderItem(item)}
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>

        <div className="absolute inset-y-0 left-0 flex items-center md:hidden">
          <button
            type="button"
            aria-label={prevLabel}
            className={cn("-ml-3", mobileArrowClass(canScrollPrev))}
            onClick={scrollPrev}
          >
            <ChevronLeft className="h-4 w-4 text-brand-strong" />
          </button>
        </div>
        <div className="absolute inset-y-0 right-0 flex items-center md:hidden">
          <button
            type="button"
            aria-label={nextLabel}
            className={cn("-mr-3", mobileArrowClass(canScrollNext))}
            onClick={scrollNext}
          >
            <ChevronRight className="h-4 w-4 text-brand-strong" />
          </button>
        </div>
      </div>
    </section>
  );
}
