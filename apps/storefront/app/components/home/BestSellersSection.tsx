import { Link } from "react-router";
import { useState, useCallback, useEffect } from "react";
import { ProductCard } from "../shared/ProductCard";
import type { StorefrontProductItem } from "../../lib/api";
import { backendAssetUrl } from "../../lib/api";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { getLocalized } from "../../lib/translation";
import Container from "../container";
import { Carousel, CarouselContent, CarouselItem, type CarouselApi } from "../ui/carousel";

interface BestSellersSectionProps {
  products: StorefrontProductItem[];
  locale?: string;
}

export function BestSellersSection({ products, locale = "vi" }: BestSellersSectionProps) {
  const [api, setApi] = useState<CarouselApi>();
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(true); // Default to true if multiple items

  useEffect(() => {
    if (!api) {
      return;
    }

    setCanScrollPrev(api.canScrollPrev());
    setCanScrollNext(api.canScrollNext());

    api.on("select", () => {
      setCanScrollPrev(api.canScrollPrev());
      setCanScrollNext(api.canScrollNext());
    });
  }, [api]);

  const scrollPrev = useCallback(() => {
    if (api) api.scrollPrev();
  }, [api]);

  const scrollNext = useCallback(() => {
    if (api) api.scrollNext();
  }, [api]);

  if (products.length === 0) return null;

  // Cap at 8 per spec
  const displayProducts = products.slice(0, 8);

  return (
    <Container className="py-16 md:py-24 overflow-hidden">
      <div className="max-w-container-max mx-auto">
        {/* Header row */}
        <div className="relative flex justify-center items-center mb-10 md:mb-14 reveal active">
          <h2 className="font-heading text-xl md:text-2xl font-bold uppercase tracking-wide text-on-surface text-center">
            {locale === "en" ? "Best Selling Products" : "Sản phẩm bán chạy nhất"}
          </h2>
          <div className="hidden md:flex absolute right-0 items-center gap-4 text-on-surface-variant">
            <button 
              aria-label="Previous" 
              className={`transition-colors ${canScrollPrev ? "hover:text-on-surface text-on-surface-variant" : "text-gray-300 cursor-not-allowed"}`}
              onClick={scrollPrev}
              disabled={!canScrollPrev}
            >
              <ChevronLeft className="w-6 h-6 stroke-[1.5]" />
            </button>
            <button 
              aria-label="Next" 
              className={`transition-colors ${canScrollNext ? "hover:text-on-surface text-on-surface-variant" : "text-gray-300 cursor-not-allowed"}`}
              onClick={scrollNext}
              disabled={!canScrollNext}
            >
              <ChevronRight className="w-6 h-6 stroke-[1.5]" />
            </button>
          </div>
        </div>

        {/* Product Carousel */}
        <div className="relative group">
          <Carousel setApi={setApi} opts={{ align: "start", dragFree: true }} className="w-full">
            <CarouselContent className="-ml-4">
              {displayProducts.map((product, index) => {
                const imgSrc = product.thumbnail
                  ? backendAssetUrl(product.thumbnail)
                  : undefined;
                // Mock reviews count based on UI examples: 266, 290, 393, 89
                const mockReviews = [266, 290, 393, 89, 120, 85, 420, 150];
                return (
                  <CarouselItem key={product.id} className="pl-4 basis-1/2 md:basis-1/4">
                    <ProductCard
                      {...product}
                      thumbnail={imgSrc}
                      title={getLocalized(product.title, locale)}
                      subtitle={getLocalized(product.subtitle, locale) || null}
                      categorySummary={getLocalized(product.categorySummary, locale) || null}
                      imageAlt={getLocalized(product.title, locale)}
                      rating={5}
                      reviewsCount={mockReviews[index % mockReviews.length]}
                      priceFrom={true}
                    />
                  </CarouselItem>
                );
              })}
            </CarouselContent>
          </Carousel>
          
          {/* Mobile navigation arrows overlaid on the carousel */}
          <div className="md:hidden absolute inset-y-0 left-0 flex items-center">
             <button 
                aria-label="Previous" 
                className={`w-8 h-8 flex items-center justify-center rounded-full bg-surface shadow-sm border border-outline-variant -ml-4 z-10 transition-opacity ${canScrollPrev ? "opacity-100" : "opacity-0 pointer-events-none"}`}
                onClick={scrollPrev}
              >
                <ChevronLeft className="w-4 h-4 text-on-surface" />
              </button>
          </div>
          <div className="md:hidden absolute inset-y-0 right-0 flex items-center">
             <button 
                aria-label="Next" 
                className={`w-8 h-8 flex items-center justify-center rounded-full bg-surface shadow-sm border border-outline-variant -mr-4 z-10 transition-opacity ${canScrollNext ? "opacity-100" : "opacity-0 pointer-events-none"}`}
                onClick={scrollNext}
              >
                <ChevronRight className="w-4 h-4 text-on-surface" />
              </button>
          </div>
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
    </Container>
  );
}
