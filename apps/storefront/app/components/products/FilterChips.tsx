import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";

export interface CategoryOption {
  name: string;
  handle: string;
}

export interface FilterChipsProps {
  categories: CategoryOption[];
  activeCategory?: string;
  onSelect?: (category: string) => void;
}

export function FilterChips({ categories, activeCategory, onSelect }: FilterChipsProps) {
  return (
    <Carousel
      opts={{
        align: "start",
        loop: false,
        dragFree: true,
        duration: 5,
      }}
      className="px-8"
    >
      <CarouselContent className="gap-3 ml-0">
        {categories.map((cat) => {
          const isActive = cat.name === activeCategory || (!activeCategory && cat.handle === "");
          return (
            <CarouselItem key={cat.handle} className="pl-0 basis-auto">
              <button
                onClick={() => onSelect?.(cat.name)}
                className={`whitespace-nowrap px-6 py-2 rounded-full font-label-md text-label-md border transition-all duration-300 ${
                  isActive
                    ? "bg-primary text-on-primary border-primary"
                    : "bg-surface-container-low hover:bg-surface-variant border-outline-variant text-on-surface-variant"
                }`}
              >
                {cat.name}
              </button>
            </CarouselItem>
          );
        })}
      </CarouselContent>
      <CarouselPrevious
        variant="outline"
        size="icon"
        className="hidden md:inline-flex absolute left-0 md:-left-2 top-1/2 -translate-y-1/2 z-10"
      />
      <CarouselNext
        variant="outline"
        size="icon"
        className="hidden md:inline-flex absolute right-0 md:-right-2 top-1/2 -translate-y-1/2 z-10"
      />
    </Carousel>
  );
}
